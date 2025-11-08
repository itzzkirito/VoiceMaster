import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  codeBlock,
  TextChannel,
  NewsChannel,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';
import { env } from '../../config/env.config';
import { logger } from '../../utils/logger';

/**
 * Terminal Command
 * Shows terminal logs
 */
const terminalLogs: string[] = [];
const MAX_LOGS = 100;

// Intercept console.log and console.error
const originalLog = console.log.bind(console);
const originalError = console.error.bind(console);
const originalWarn = console.warn.bind(console);
const originalInfo = console.info.bind(console);

console.log = (...args: any[]): void => {
  const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');
  terminalLogs.push(`[LOG] ${new Date().toISOString()} - ${message}`);
  if (terminalLogs.length > MAX_LOGS) {
    terminalLogs.shift();
  }
  originalLog(...args);
};

console.error = (...args: any[]): void => {
  const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');
  terminalLogs.push(`[ERROR] ${new Date().toISOString()} - ${message}`);
  if (terminalLogs.length > MAX_LOGS) {
    terminalLogs.shift();
  }
  originalError(...args);
};

console.warn = (...args: any[]): void => {
  const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');
  terminalLogs.push(`[WARN] ${new Date().toISOString()} - ${message}`);
  if (terminalLogs.length > MAX_LOGS) {
    terminalLogs.shift();
  }
  originalWarn(...args);
};

console.info = (...args: any[]): void => {
  const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');
  terminalLogs.push(`[INFO] ${new Date().toISOString()} - ${message}`);
  if (terminalLogs.length > MAX_LOGS) {
    terminalLogs.shift();
  }
  originalInfo(...args);
};

export default class TerminalCommand extends Command {
  constructor() {
    super({
      name: 'terminal',
      description: 'Shows terminal logs (Owner only)',
      category: 'owner',
      ownerOnly: true,
      noPrefix: true,
      supportsMessageCommands: true,
      cooldown: 5,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('terminal')
      .setDescription('Shows terminal logs')
      .addIntegerOption((option) =>
        option
          .setName('lines')
          .setDescription('Number of lines to show (default: 50, max: 100)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(100)
      );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const userId = interaction.user.id;
    const isOwner = userId === env.OWNER_ID || env.DEVELOPER_IDS.includes(userId);

    if (!isOwner) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'You do not have permission to use this command.')],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const lines = interaction.options.getInteger('lines') || 50;
      const logsToShow = Math.min(lines, MAX_LOGS);

      if (terminalLogs.length === 0) {
        await interaction.editReply({
          embeds: [embeds.info('Terminal Logs', 'No terminal logs available.')],
        });
        return;
      }

      const recentLogs = terminalLogs.slice(-logsToShow);
      const logsText = recentLogs.join('\n');

      // Split into chunks if too long (Discord has 2000 character limit per message)
      const chunks = this.splitIntoChunks(logsText, 1900);

      if (chunks.length === 1) {
        await interaction.editReply({
          content: codeBlock('log', chunks[0] || 'No logs'),
        });
      } else {
        // Send first chunk
        await interaction.editReply({
          content: codeBlock('log', chunks[0] || 'No logs'),
        });

        // Send remaining chunks as follow-ups
        for (let i = 1; i < chunks.length; i++) {
          await interaction.followUp({
            content: codeBlock('log', chunks[i] || ''),
            ephemeral: true,
          });
        }
      }

      logger.info(`[TERMINAL] ${interaction.user.tag} viewed ${logsToShow} terminal logs`);
    } catch (error) {
      logger.error({ err: error }, '[TERMINAL] Error');
      await interaction.editReply({
        embeds: [
          embeds.error(
            'Error',
            `Failed to retrieve terminal logs: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
      });
    }
  }

  override async messageExecute({ message }: MessageCommandArgs): Promise<void> {
    const userId = message.author.id;
    const isOwner = userId === env.OWNER_ID || env.DEVELOPER_IDS.includes(userId);

    if (!isOwner) {
      await message.reply({
        embeds: [embeds.error('Error', 'You do not have permission to use this command.')],
      });
      return;
    }

    try {
      if (terminalLogs.length === 0) {
        // Try to send via DM first, fallback to channel if DMs are disabled
        try {
          await message.author.send({
            embeds: [embeds.info('Terminal Logs', 'No terminal logs available.')],
          });
          await message.reply({
            embeds: [embeds.success('Success', 'Terminal logs sent to your DM.')],
          });
        } catch (dmError: any) {
          // If DM fails (error 50007: Cannot send messages to this user), reply in channel
          if (dmError.code === 50007) {
            await message.reply({
              embeds: [embeds.info('Terminal Logs', 'No terminal logs available.\n\n*Note: DMs are disabled, so logs are sent here.*')],
            });
          } else {
            throw dmError;
          }
        }
        return;
      }

      // Get last 50 logs by default
      const recentLogs = terminalLogs.slice(-50);
      const logsText = recentLogs.join('\n');

      // Split into chunks
      const chunks = this.splitIntoChunks(logsText, 1900);

      // Try to send logs via DM first
      let dmSent = false;
      try {
        for (const chunk of chunks) {
          await message.author.send({
            content: codeBlock('log', chunk),
          });
        }
        dmSent = true;
        await message.reply({
          embeds: [embeds.success('Success', 'Terminal logs sent to your DM.')],
        });
      } catch (dmError: any) {
        // If DM fails (error 50007: Cannot send messages to this user), send in channel instead
        if (dmError.code === 50007) {
          logger.warn(`[TERMINAL] Cannot send DM to ${message.author.tag}, sending logs in channel instead`);
          
          // Send logs in the channel instead
          if (chunks.length === 1) {
            await message.reply({
              content: codeBlock('log', chunks[0] || 'No logs'),
              embeds: [embeds.warning('DM Disabled', 'Your DMs are disabled. Logs are sent here instead.')],
            });
          } else {
            // Send first chunk as reply
            await message.reply({
              content: codeBlock('log', chunks[0] || 'No logs'),
              embeds: [embeds.warning('DM Disabled', 'Your DMs are disabled. Logs are sent here instead.')],
            });

            // Send remaining chunks as follow-ups
            // Only send if we're in a guild text channel (not a DM)
            if (message.guild && (message.channel instanceof TextChannel || message.channel instanceof NewsChannel)) {
              for (let i = 1; i < chunks.length; i++) {
                await message.channel.send({
                  content: codeBlock('log', chunks[i] || ''),
                });
              }
            } else if (message.channel.isTextBased() && 'send' in message.channel) {
              // Fallback for other text-based channels that support send
              for (let i = 1; i < chunks.length; i++) {
                await (message.channel as any).send({
                  content: codeBlock('log', chunks[i] || ''),
                });
              }
            } else {
              // If channel doesn't support sending, just log a warning
              logger.warn(`[TERMINAL] Cannot send remaining chunks - channel type not supported or in DM`);
            }
          }
          dmSent = false;
        } else {
          // Other error, throw it
          throw dmError;
        }
      }

      logger.info(`[TERMINAL] ${message.author.tag} viewed terminal logs${dmSent ? ' (via DM)' : ' (via channel - DMs disabled)'}`);
    } catch (error) {
      logger.error({ err: error }, '[TERMINAL] Error');
      
      // Check if it's a DM error and handle gracefully
      const isDMError = error && typeof error === 'object' && 'code' in error && error.code === 50007;
      
      if (isDMError) {
        await message.reply({
          embeds: [embeds.warning('DM Disabled', 'Cannot send terminal logs via DM. Please enable DMs or use the slash command `/terminal` instead.')],
        });
      } else {
        await message.reply({
          embeds: [
            embeds.error(
              'Error',
              `Failed to retrieve terminal logs: ${error instanceof Error ? error.message : String(error)}`
            ),
          ],
        });
      }
    }
  }

  private splitIntoChunks(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    const lines = text.split('\n');
    let currentChunk = '';

    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = '';
        }
        // If a single line is too long, truncate it
        if (line.length > maxLength) {
          chunks.push(line.substring(0, maxLength - 3) + '...');
        } else {
          currentChunk = line;
        }
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }
}

