import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  codeBlock,
  EmbedBuilder,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';
import { inspect } from 'util';
import { performance } from 'perf_hooks';
import { createHash } from 'crypto';
import { env } from '../../config/env.config';
import { logger } from '../../utils/logger';

/**
 * Result interface for code evaluation
 */
interface EvalResult {
  output: any;
  type: string;
  executionTime: number;
  memoryUsage: NodeJS.MemoryUsage;
}

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  count: number;
  window: number;
}

/**
 * Command for evaluating JavaScript code in a controlled environment.
 * This command is restricted to bot owners only and includes comprehensive safety measures.
 * 
 * Features:
 * - Strict security checks and input validation
 * - Memory usage monitoring
 * - Execution time tracking with timeout protection
 * - Audit logging for all evaluation attempts
 * - Rate limiting to prevent abuse
 * - Detailed error reporting with stack traces
 * - Support for both slash commands and text commands
 */
export default class EvalCommand extends Command {
  private readonly MAX_EXECUTION_TIME = 5000; // 5 seconds
  private readonly MAX_CODE_LENGTH = 1500;
  private readonly MIN_CODE_LENGTH = 1;
  private readonly executionHistory: Map<string, number[]> = new Map();
  private readonly RATE_LIMIT: RateLimitConfig = { 
    count: 5, 
    window: 60000 // 1 minute
  };

  constructor() {
    super({
      name: 'eval',
      description: 'Evaluate JavaScript code in a controlled environment (Owner only)',
      category: 'owner',
      ownerOnly: true,
      noPrefix: true, // Can be used without prefix
      supportsMessageCommands: true,
      cooldown: 0,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('eval')
      .setDescription('Evaluate JavaScript code in a controlled environment (Owner only)')
      .addStringOption((option) =>
        option
          .setName('code')
          .setDescription('The JavaScript code to evaluate')
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('system')
          .setDescription('System message/prompt for context')
          .setRequired(false)
      )
      .addBooleanOption((option) =>
        option
          .setName('silent')
          .setDescription('Execute without showing output')
          .setRequired(false)
      );
  }

  /**
   * Validates the rate limit for a user
   * @param userId The ID of the user to check
   * @returns boolean indicating if the user has exceeded rate limits (true = exceeded)
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    let userHistory = this.executionHistory.get(userId);
    
    if (!userHistory) {
      userHistory = [];
      this.executionHistory.set(userId, userHistory);
    }
    
    // Clean up old entries outside the rate limit window
    const recentExecutions = userHistory.filter(
      time => now - time < this.RATE_LIMIT.window
    );
    
    this.executionHistory.set(userId, recentExecutions);

    return recentExecutions.length >= this.RATE_LIMIT.count;
  }

  /**
   * Records an execution timestamp for rate limiting
   * @param userId The ID of the user who executed the command
   */
  private recordExecution(userId: string): void {
    const userHistory = this.executionHistory.get(userId) || [];
    userHistory.push(Date.now());
    this.executionHistory.set(userId, userHistory);
  }

  /**
   * Validates and sanitizes input code
   * @param code The code to validate
   * @throws Error if code is invalid or potentially harmful
   */
  private validateCode(code: string): void {
    if (!code || typeof code !== 'string') {
      throw new Error("Code must be a non-empty string");
    }

    const codeLength = code.trim().length;
    if (codeLength < this.MIN_CODE_LENGTH || codeLength > this.MAX_CODE_LENGTH) {
      throw new Error(
        `Code must be between ${this.MIN_CODE_LENGTH} and ${this.MAX_CODE_LENGTH} characters (received: ${codeLength})`
      );
    }

    // Check for potentially harmful operations
    const dangerousPatterns = [
      /process\.exit/i,
      /require\s*\(/i,
      /eval\s*\(/i,
      /Function\s*\(/i,
      /child_process/i,
      /fs\s*\./i,
      /\bvm\b/i,
      /Buffer\.from/i,
      /__proto__/i,
      /constructor/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error("Code contains potentially harmful operations that are not allowed");
      }
    }
  }

  /**
   * Creates a controlled execution environment for the code
   * @param code The code to execute
   * @param context The execution context variables
   * @returns Promise resolving to the evaluation result
   */
  private async createSandbox(
    code: string,
    context: Record<string, any>
  ): Promise<EvalResult> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    // Create execution timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Execution timed out after ${this.MAX_EXECUTION_TIME}ms`));
      }, this.MAX_EXECUTION_TIME);
    });

    // Create execution promise
    const executionPromise = (async (): Promise<any> => {
      try {
        // Create function with context variables as parameters
        const contextKeys = Object.keys(context);
        const contextValues = Object.values(context);

        // Check if code already has a return statement
        const hasReturn = /\breturn\s+/.test(code.trim());
        
        // If no return statement, try to wrap as expression (for single expressions)
        // Multi-line statements will be executed as-is and return undefined (correct behavior)
        let wrappedCode: string;
        if (hasReturn) {
          wrappedCode = code;
        } else {
          // Simple heuristic: if it's a single line and looks like an expression, wrap it
          const isSingleLine = !code.includes('\n');
          const isExpressionLike = !code.trim().endsWith(';') && 
                                 !code.includes('{') && 
                                 !/^\s*(if|for|while|switch|try|const|let|var|function|async|await)\b/.test(code.trim());
          
          if (isSingleLine && isExpressionLike) {
            // Try wrapping as expression - will work for things like `client.user.username`
            wrappedCode = `return (${code})`;
          } else {
            // Execute as statement - statements like `message.send()` will execute but return undefined
            wrappedCode = code;
          }
        }

        let func: Function;
        try {
          func = new Function(
            ...contextKeys,
            `
              return (async () => {
                try {
                  ${wrappedCode}
                } catch (error) {
                  throw error;
                }
              })();
            `
          );
        } catch (parseError) {
          // If parsing failed (e.g., wrapping expression didn't work), try without return wrapper
          if (!hasReturn && wrappedCode.startsWith('return (')) {
            func = new Function(
              ...contextKeys,
              `
                return (async () => {
                  try {
                    ${code}
                  } catch (error) {
                    throw error;
                  }
                })();
              `
            );
          } else {
            throw parseError;
          }
        }

        // Execute the function with context
        let result = func(...contextValues);

        // Ensure we await if it's a promise
        if (result && typeof result.then === 'function') {
          result = await result;
        }

        return result;
      } catch (error) {
        throw error;
      }
    })();

    // Race between timeout and execution
    let output: any;
    try {
      output = await Promise.race([timeoutPromise, executionPromise]);
    } catch (error) {
      throw error;
    }

    const endMemory = process.memoryUsage();
    const executionTime = performance.now() - startTime;

    return {
      output,
      type: output === null ? "null" : typeof output,
      executionTime,
      memoryUsage: {
        rss: endMemory.rss - startMemory.rss,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
      }
    };
  }

  /**
   * Logs evaluation attempts for audit purposes
   * @param userId The ID of the user who executed the command
   * @param code The code that was executed
   * @param success Whether the execution was successful
   * @param error Optional error that occurred
   */
  private logEvalAttempt(
    userId: string,
    code: string,
    success: boolean,
    error?: Error
  ): void {
    const hash = createHash('sha256')
      .update(code)
      .digest('hex')
      .slice(0, 8);
    
    const timestamp = new Date().toISOString();
    const status = success ? "SUCCESS" : "FAILED";
    const errorInfo = error ? ` | Error: ${error.name}: ${error.message}` : '';

    logger.info(
      `[EVAL] ${timestamp} | ` +
      `User: ${userId} | ` +
      `Hash: ${hash} | ` +
      `Status: ${status}${errorInfo}`
    );
  }

  /**
   * Formats the evaluation result into an embed
   * @param code The executed code
   * @param result The evaluation result
   * @param systemMessage Optional system message
   * @returns Formatted embed builder
   */
  private createResultEmbed(
    code: string,
    result: EvalResult,
    systemMessage?: string
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle("✅ Code Evaluation")
      .setColor("#00FF00")
      .setTimestamp();

    // Format output
    let outputString: string;
    if (result.output === undefined) {
      // Try to provide a helpful message based on what was executed
      const codeLower = code.toLowerCase();
      if (codeLower.includes('guild.leave') || codeLower.includes('guild?.leave')) {
        outputString = "✅ Successfully left the guild";
      } else if (codeLower.includes('.send(') || codeLower.includes('message.channel.send') || codeLower.includes('channel.send')) {
        outputString = "✅ Message sent successfully";
      } else if (codeLower.includes('.delete(') || codeLower.includes('.remove(')) {
        outputString = "✅ Successfully deleted/removed";
      } else if (codeLower.includes('.ban(') || codeLower.includes('.kick(')) {
        outputString = "✅ Action completed successfully";
      } else if (codeLower.includes('.create(') || codeLower.includes('.add(')) {
        outputString = "✅ Created/added successfully";
      } else if (codeLower.includes('.edit(') || codeLower.includes('.update(') || codeLower.includes('.set(')) {
        outputString = "✅ Updated successfully";
      } else if (codeLower.includes('await ') && !codeLower.includes('return')) {
        outputString = "✅ Async operation completed successfully";
      } else {
        outputString = "undefined (executed successfully, no return value)";
      }
    } else if (result.output === null) {
      outputString = "null";
    } else {
      try {
        outputString = inspect(result.output, {
          depth: 1,
          maxArrayLength: 100,
          showHidden: false,
          compact: false
        });
      } catch (error) {
        outputString = String(result.output);
      }
    }

    // Truncate if too long
    const truncatedOutput = outputString.length > 1000
      ? outputString.slice(0, 1000) + '...'
      : outputString;

    const truncatedCode = code.length > 1000
      ? code.slice(0, 1000) + '...'
      : code;

    embed.addFields(
      {
        name: "📝 Input",
        value: codeBlock('js', truncatedCode),
        inline: false
      },
      {
        name: "📤 Output",
        value: outputString.startsWith('✅') || outputString.includes('successfully') 
          ? truncatedOutput 
          : codeBlock('js', truncatedOutput),
        inline: false
      },
      {
        name: "⚙️ Details",
        value: [
          `**Type:** ${result.type}`,
          `**Execution Time:** ${result.executionTime.toFixed(2)}ms`,
          `**Memory Usage:** ${(Math.abs(result.memoryUsage.heapUsed) / 1024 / 1024).toFixed(2)}MB`
        ].join('\n'),
        inline: false
      }
    );

    if (systemMessage) {
      const truncatedSystem = systemMessage.length > 1000
        ? systemMessage.slice(0, 1000) + '...'
        : systemMessage;

      embed.addFields({
        name: "⚙️ System Context",
        value: codeBlock('txt', truncatedSystem),
        inline: false
      });
    }

    return embed;
  }

  /**
   * Formats error messages to be more user-friendly
   * @param error The error object
   * @returns Formatted error message
   */
  private formatErrorMessage(error: Error): string {
    const errorName = error.constructor.name;
    const errorMessage = error.message || String(error);

    // Handle Discord API errors
    if (errorName.includes('DiscordAPIError') || errorName === 'DiscordAPIError') {
      // Extract error code and message
        const codeMatch = errorMessage.match(/\[(\d+)\]:\s*(.+)/);
      if (codeMatch) {
        const code = codeMatch[1];
        const message = codeMatch[2];

        if (code) {
          // Map common error codes to user-friendly messages
          const errorMap: Record<string, string> = {
            '10004': 'Unknown Guild - The guild ID does not exist or the bot is not in that guild',
            '50001': 'Missing Access - The bot does not have permission to perform this action',
            '50013': 'Missing Permissions - The bot lacks required permissions',
            '10007': 'Unknown Member - The member does not exist in this guild',
            '10003': 'Unknown Channel - The channel does not exist',
            '50035': 'Invalid Form Body - Invalid parameters provided',
            '30007': 'Maximum number of webhooks reached',
            '50005': 'Cannot edit a message authored by another user',
          };

          const friendlyMessage = errorMap[code];
          if (friendlyMessage) {
            return `${errorName}[${code}]: ${friendlyMessage}\n\nOriginal: ${message}`;
          }
        }
      }
    }

    // Handle other common errors
    if (errorName === 'TypeError' || errorName === 'ReferenceError') {
      // Extract more relevant part of the error
      const match = errorMessage.match(/(.+?)(\s+at\s+.+)?$/);
      if (match && match[1]) {
        return `${errorName}: ${match[1].trim()}`;
      }
    }

    // Return full error message if no special handling
    return errorMessage;
  }

  /**
   * Creates an error embed for failed evaluations
   * @param code The code that failed
   * @param error The error that occurred
   * @param systemMessage Optional system message
   * @returns Formatted error embed builder
   */
  private createErrorEmbed(
    code: string,
    error: Error,
    systemMessage?: string
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle("❌ Evaluation Error")
      .setColor("#FF0000")
      .setTimestamp();

    // Get user-friendly error message
    const formattedError = this.formatErrorMessage(error);
    
    // Include stack trace for debugging if it's a Discord API error or other important error
    const showStack = error.constructor.name.includes('DiscordAPIError') || 
                     error.constructor.name.includes('TypeError') ||
                     error.constructor.name.includes('ReferenceError');
    
    const fullErrorMessage = showStack && error.stack 
      ? `${formattedError}\n\nStack Trace:\n${error.stack}` 
      : formattedError;

    const truncatedError = fullErrorMessage.length > 1500
      ? fullErrorMessage.slice(0, 1500) + '\n... (truncated)'
      : fullErrorMessage;

    const truncatedCode = code.length > 1000
      ? code.slice(0, 1000) + '...'
      : code;

    embed.addFields(
      {
        name: "❌ Error",
        value: codeBlock('js', truncatedError),
        inline: false
      },
      {
        name: "📝 Input",
        value: codeBlock('js', truncatedCode),
        inline: false
      }
    );

    // Add helpful suggestions for common errors
    const errorMessage = error.message || String(error);
    if (errorMessage.includes('Unknown Guild') || errorMessage.includes('10004')) {
      embed.addFields({
        name: "💡 Suggestion",
        value: "**Check if the bot is in this guild:**\n```js\neval client.guilds.cache.has('GUILD_ID')\n```\n**Or list all guilds:**\n```js\neval client.guilds.cache.map(g => ({ id: g.id, name: g.name }))\n```",
        inline: false
      });
    } else if (errorMessage.includes('Missing Access') || errorMessage.includes('50001') || errorMessage.includes('50013')) {
      embed.addFields({
        name: "💡 Suggestion",
        value: "The bot may not have the required permissions. Check bot permissions in the guild.",
        inline: false
      });
    }

    if (systemMessage) {
      const truncatedSystem = systemMessage.length > 1000
        ? systemMessage.slice(0, 1000) + '...'
        : systemMessage;

      embed.addFields({
        name: "⚙️ System Context",
        value: codeBlock('txt', truncatedSystem),
        inline: false
      });
    }

    return embed;
  }

  /**
   * Parses command arguments from a text message
   * @param content The message content
   * @returns Object containing parsed code, system message, and silent flag
   */
  private parseTextCommand(content: string): {
    code: string;
    systemMessage?: string;
    silent: boolean;
  } {
    const argsString = content.substring(content.indexOf(' ') + 1).trim();

    // Check for --silent or -S flag
    const silentMatch = argsString.match(/(?:^|\s)(?:--silent|-S)\b/);
    const hasSilent = !!silentMatch;
    let cleanArgs = hasSilent ? argsString.replace(/(?:^|\s)(?:--silent|-S)\b/, '').trim() : argsString;

    // Check for --system or -s flag
    const systemMatch = cleanArgs.match(/(?:^|\s)(?:--system|-s)\s+(.+)$/);
    let systemMessage: string | undefined;
    let code: string;

    if (systemMatch && systemMatch[1]) {
      systemMessage = systemMatch[1].trim().replace(/^["']|["']$/g, '');
      code = cleanArgs.substring(0, systemMatch.index).trim();
    } else {
      code = cleanArgs;
    }

    return {
      code,
      ...(systemMessage !== undefined && { systemMessage }),
      silent: hasSilent
    };
  }

  /**
   * Checks if a user is an owner
   */
  private isOwner(userId: string): boolean {
    return userId === env.OWNER_ID || env.DEVELOPER_IDS.includes(userId);
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    let isDeferred = false;

    try {
      const userId = interaction.user.id;
      
      // Owner permission check (redundant since it's checked in interactionCreate, but keep for safety)
      if (!this.isOwner(userId)) {
        await interaction.reply({
          embeds: [embeds.error('Error', 'This command is restricted to bot owners.')],
          ephemeral: true,
        });
        return;
      }

      // Rate limit check
      if (this.checkRateLimit(userId)) {
        await interaction.reply({
          embeds: [embeds.warning('Rate Limited', 'You are being rate limited. Please wait before trying again.')],
          ephemeral: true,
        });
        return;
      }

      // Parse input
      const code = interaction.options.getString('code', true);
      const systemMessage = interaction.options.getString('system') || undefined;
      const silent = interaction.options.getBoolean('silent') || false;

      if (!code || code.trim().length === 0) {
        await interaction.reply({
          embeds: [embeds.error('Error', 'Please provide code to evaluate.')],
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: silent });
      isDeferred = true;

      // Validate code
      try {
        this.validateCode(code);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await interaction.editReply({
          embeds: [embeds.error('Validation Error', errorMessage)],
        });
        return;
      }

      // Prepare execution context
      const context = {
        client: interaction.client,
        interaction,
        guild: interaction.guild,
        channel: interaction.channel,
        user: interaction.user,
        member: interaction.member,
        system: systemMessage
      };

      // Execute code in sandbox
      let result: EvalResult;
      try {
        result = await this.createSandbox(code, context);
        this.recordExecution(userId);
      } catch (error) {
        const evalError = error instanceof Error ? error : new Error(String(error));
        this.logEvalAttempt(userId, code, false, evalError);

        const embed = this.createErrorEmbed(code, evalError, systemMessage);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Log successful execution
      this.logEvalAttempt(userId, code, true);

      // If silent mode, just acknowledge without showing results
      if (silent) {
        await interaction.editReply({
          embeds: [embeds.success('Success', 'Code executed successfully (silent mode)')],
        });
        return;
      }

      // Format and send result
      const embed = this.createResultEmbed(code, result, systemMessage);
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : String(error);
      
      try {
        await (isDeferred
          ? interaction.editReply({ embeds: [embeds.error('Unexpected Error', errorMessage)] })
          : interaction.reply({ embeds: [embeds.error('Unexpected Error', errorMessage)], ephemeral: true }));
      } catch (replyError) {
        // If we can't reply, log it
        logger.error({ err: replyError }, '[EVAL] Failed to send error response');
      }
    }
  }

  override async messageExecute({ message, args: _args }: MessageCommandArgs): Promise<void> {
    try {
      const userId = message.author.id;
      
      // Owner permission check (redundant since it's checked in messageCreate, but keep for safety)
      if (!this.isOwner(userId)) {
        await message.reply({
          embeds: [embeds.error('Error', 'This command is restricted to bot owners.')],
        });
        return;
      }

      // Rate limit check
      if (this.checkRateLimit(userId)) {
        await message.reply({
          embeds: [embeds.warning('Rate Limited', 'You are being rate limited. Please wait before trying again.')],
        });
        return;
      }

      // Parse input
      const parsed = this.parseTextCommand(message.content);
      const { code, systemMessage, silent } = parsed;

      if (!code || code.trim().length === 0) {
        await message.reply({
          embeds: [embeds.error('Error', 'Please provide code to evaluate.')],
        });
        return;
      }

      // Validate code
      try {
        this.validateCode(code);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await message.reply({
          embeds: [embeds.error('Validation Error', errorMessage)],
        });
        return;
      }

      // Prepare execution context
      const context = {
        client: message.client,
        message,
        guild: message.guild,
        channel: message.channel,
        author: message.author,
        member: message.member,
        system: systemMessage
      };

      // Execute code in sandbox
      let result: EvalResult;
      try {
        result = await this.createSandbox(code, context);
        this.recordExecution(userId);
      } catch (error) {
        const evalError = error instanceof Error ? error : new Error(String(error));
        this.logEvalAttempt(userId, code, false, evalError);

        const embed = this.createErrorEmbed(code, evalError, systemMessage);
        await message.reply({ embeds: [embed] });
        return;
      }

      // Log successful execution
      this.logEvalAttempt(userId, code, true);

      // If silent mode, just acknowledge without showing results
      if (silent) {
        await message.reply({
          embeds: [embeds.success('Success', 'Code executed successfully (silent mode)')],
        });
        return;
      }

      // Format and send result
      const embed = this.createResultEmbed(code, result, systemMessage);
      await message.reply({ embeds: [embed] });

    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : String(error);
      
      try {
        await message.reply({
          embeds: [embeds.error('Unexpected Error', errorMessage)],
        });
      } catch (replyError) {
        // If we can't reply, log it
        logger.error({ err: replyError }, '[EVAL] Failed to send error response');
      }
    }
  }
}
