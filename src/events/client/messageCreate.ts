import { Message } from 'discord.js';
import { Event } from '../../structures/Event';
import { Command } from '../../structures/Command';
import { logger } from '../../utils/logger';
import { botConfig } from '../../config/bot.config';
import { webhookService } from '../../services/webhookService';
import { commands } from '../../commands';
import { embeds } from '../../utils/embeds';
import { errorHandler } from '../../utils/errorHandler';
import { cooldownManager } from '../../utils/cooldownManager';
import { env } from '../../config/env.config';
import { BotClient } from '../../client';
import { User, Guild } from '../../models';
import mongoose from 'mongoose';

export default class MessageCreateEvent extends Event<'messageCreate'> {
  constructor() {
    super({
      name: 'messageCreate',
      once: false,
    });
  }

  async execute(message: Message) {
    // Ignore bot messages
    if (message.author.bot) return;

    const client = message.client as BotClient;
    const botUser = client.user;

    if (!botUser) return;

    // Check if user is blacklisted (non-blocking, fail silently)
    // Only check if database is connected
    if (mongoose.connection.readyState === 1) {
      try {
        const userData = await User.findOne({ discordId: message.author.id }).lean().catch(() => null);
        if (userData?.isBlacklisted) {
          return; // Silently ignore blacklisted users
        }
      } catch (error) {
        // Continue if check fails - don't block commands
      }
    }

    // Check if guild is blacklisted (non-blocking, fail silently)
    // Only check if database is connected
    if (message.guild && mongoose.connection.readyState === 1) {
      try {
        const guildData = await Guild.findOne({ discordId: message.guild.id }).lean().catch(() => null);
        if (guildData?.isBlacklisted) {
          return; // Silently ignore blacklisted guilds
        }
      } catch (error) {
        // Continue if check fails - don't block commands
      }
    }

    let commandName: string | null = null;
    let args: string[] = [];
    let isPrefixCommand = false;
    let isMentionCommand = false;
    let isNoPrefixCommand = false;
    let noPrefixCommand: Command | undefined = undefined;

    // Get guild-specific prefix (with caching)
    let prefix = botConfig.prefix; // Default prefix
    if (message.guild) {
      // Check cache first
      const cachedPrefix = client.guildPrefixes.get(message.guild.id);
      if (cachedPrefix !== undefined) {
        prefix = cachedPrefix;
      } else if (mongoose.connection.readyState === 1) {
        // Cache miss - fetch from database (non-blocking)
        try {
          const guildData = await Guild.findOne({ discordId: message.guild.id })
            .select('prefix')
            .lean()
            .catch(() => null);
          
          if (guildData?.prefix) {
            prefix = guildData.prefix;
            // Cache the prefix
            client.guildPrefixes.set(message.guild.id, prefix);
          } else {
            // No custom prefix - use default and cache it
            client.guildPrefixes.set(message.guild.id, botConfig.prefix);
          }
        } catch (error) {
          // If database query fails, use default prefix
          logger.debug(`Failed to fetch prefix for guild ${message.guild.id}:`, error instanceof Error ? error : undefined);
        }
      }
    }

    // Check for prefix commands (only in guilds, or if message explicitly starts with prefix)
    if (message.content.startsWith(prefix)) {
      isPrefixCommand = true;
      const content = message.content.slice(prefix.length).trim();
      if (!content) return; // Empty command, ignore
      const parts = content.split(/\s+/);
      commandName = parts.shift()?.toLowerCase() || null;
      args = parts;
    }
    // Check for mention commands (bot mention followed by command)
    else if (message.mentions.has(botUser)) {
      isMentionCommand = true;
      // Remove all bot mentions (both <@id> and <@!id> formats)
      const mentionRegex = new RegExp(`<@!?${botUser.id}>`, 'g');
      const content = message.content.replace(mentionRegex, '').trim();
      const parts = content.split(/\s+/).filter(part => part.length > 0);
      commandName = parts.shift()?.toLowerCase() || null;
      args = parts;

      // If no command after mention, show help or info
      if (!commandName) {
        // Get prefix for display (use cached value if available, otherwise default)
        const displayPrefix = message.guild 
          ? (client.guildPrefixes.get(message.guild.id) || botConfig.prefix)
          : botConfig.prefix;
        
        await message.reply({
          embeds: [
            embeds.info(
              'Bot Mention',
              `Hey! Use \`${displayPrefix}<command>\` or \`@${botUser.username} <command>\` to run commands.\nUse \`/help\` for a list of commands.`
            ),
          ],
        });
        return;
      }
    }
    // Check for no-prefix commands (works in both DMs and guilds)
    // Only check if message doesn't start with prefix or mention
    if (!isPrefixCommand && !isMentionCommand) {
      const content = message.content.trim();
      // Check if message has content and doesn't look like a regular message
      if (content && content.length > 0 && !content.startsWith('http')) {
        const parts = content.split(/\s+/);
        const potentialCommand = parts.shift()?.toLowerCase();
        
        if (potentialCommand) {
          // Find command by name or alias that supports no-prefix
          noPrefixCommand = undefined; // Reset
          
          // First try to find by exact name (case-insensitive)
          for (const [, cmd] of commands) {
            if (cmd.name.toLowerCase() === potentialCommand.toLowerCase() && cmd.noPrefix === true) {
              noPrefixCommand = cmd;
              break;
            }
          }
          
          // If not found by name, search by alias
          if (!noPrefixCommand) {
            for (const [, cmd] of commands) {
              if (cmd.noPrefix === true && cmd.aliases && cmd.aliases.length > 0) {
                const aliasMatches = cmd.aliases.some(
                  (alias) => alias.toLowerCase() === potentialCommand.toLowerCase()
                );
                if (aliasMatches) {
                  noPrefixCommand = cmd;
                  break;
                }
              }
            }
          }
          
          // Debug: List all noPrefix commands (always log for troubleshooting)
          if (!noPrefixCommand) {
            const allNoPrefixCommands = Array.from(commands.values()).filter(cmd => cmd.noPrefix === true);
            if (allNoPrefixCommands.length > 0) {
              logger.debug(`[NOPREFIX] Available noPrefix commands: ${allNoPrefixCommands.map(c => `${c.name} (ownerOnly: ${c.ownerOnly})`).join(', ')}`);
              logger.debug(`[NOPREFIX] Searched for: "${potentialCommand}", Total commands in collection: ${commands.size}`);
            } else {
              logger.warn(`[NOPREFIX] ⚠️ No noPrefix commands found in collection! Total commands: ${commands.size}`);
            }
          }
          
          if (noPrefixCommand) {
            // Check if user is owner (normalize IDs by trimming)
            const userId = message.author.id.trim();
            const ownerId = env.OWNER_ID || '';
            const isOwnerByOwnerId = ownerId.length > 0 && userId === ownerId;
            const isOwnerByDevIds = env.DEVELOPER_IDS && 
                                   Array.isArray(env.DEVELOPER_IDS) && 
                                   env.DEVELOPER_IDS.length > 0 && 
                                   env.DEVELOPER_IDS.some(id => id.trim() === userId);
            const isOwner = isOwnerByOwnerId || isOwnerByDevIds;
            
            // Check if user has no-prefix access (non-blocking)
            let hasNoPrefix = false;
            try {
              if (client.noPrefixUsers && client.noPrefixUsers instanceof Set) {
                const userIdToCheck = message.author.id.trim();
                hasNoPrefix = client.noPrefixUsers.has(userIdToCheck);
                logger.info(`[NOPREFIX] Set check - User ID: "${userIdToCheck}", Set size: ${client.noPrefixUsers.size}, Has access: ${hasNoPrefix}`);
                // If Set check failed, try database fallback
                if (!hasNoPrefix) {
                  if (client.noPrefixUsers.size > 0) {
                    // Log first few IDs in Set for debugging
                    const setIds = Array.from(client.noPrefixUsers).slice(0, 5);
                    logger.debug(`[NOPREFIX] Sample IDs in Set: ${JSON.stringify(setIds)}`);
                  }
                  // Fallback: check database directly if Set check fails
                  if (mongoose.connection.readyState === 1) {
                    try {
                      const userData = await User.findOne({ discordId: userIdToCheck, noPrefix: true }).lean();
                      if (userData) {
                        logger.warn(`[NOPREFIX] ⚠️ User found in DB but not in Set! Adding to Set now.`);
                        client.noPrefixUsers.add(userIdToCheck);
                        hasNoPrefix = true;
                      } else {
                        logger.debug(`[NOPREFIX] User not found in database with noPrefix=true`);
                      }
                    } catch (dbError) {
                      logger.debug(`[NOPREFIX] Database fallback check failed: ${dbError}`);
                    }
                  }
                }
              } else {
                logger.warn(`[NOPREFIX] ⚠️ noPrefixUsers is not a Set or doesn't exist!`);
                // Fallback: check database directly if Set doesn't exist
                if (mongoose.connection.readyState === 1) {
                  try {
                    const userData = await User.findOne({ discordId: message.author.id.trim(), noPrefix: true }).lean();
                    if (userData) {
                      logger.warn(`[NOPREFIX] ⚠️ User found in DB but Set not initialized! Initializing Set now.`);
                      if (!client.noPrefixUsers) {
                        client.noPrefixUsers = new Set();
                      }
                      client.noPrefixUsers.add(message.author.id.trim());
                      hasNoPrefix = true;
                    }
                  } catch (dbError) {
                    logger.debug(`[NOPREFIX] Database fallback check failed: ${dbError}`);
                  }
                }
              }
            } catch (error) {
              // Continue if check fails
              logger.error({ err: error }, `[NOPREFIX] Error checking noPrefixUsers`);
            }
            
            // Debug logging (always log for troubleshooting)
            logger.info(`[NOPREFIX] Found command: ${noPrefixCommand.name}, ownerOnly: ${noPrefixCommand.ownerOnly}`);
            logger.info(`[NOPREFIX] User: ${userId}, Message: "${message.content.substring(0, 50)}"`);
            logger.info(`[NOPREFIX] Is Owner: ${isOwner}, Has NoPrefix: ${hasNoPrefix}`);
            logger.info(`[NOPREFIX] OWNER_ID: "${ownerId}", DEVELOPER_IDS: ${JSON.stringify(env.DEVELOPER_IDS)}`);
            logger.info(`[NOPREFIX] OWNER_ID match: ${isOwnerByOwnerId}`);
            if (env.DEVELOPER_IDS && Array.isArray(env.DEVELOPER_IDS)) {
              logger.info(`[NOPREFIX] DEVELOPER_IDS includes user: ${isOwnerByDevIds}`);
            }
            if (!ownerId || ownerId.length === 0) {
              logger.warn(`[NOPREFIX] ⚠️ OWNER_ID is not set in .env file!`);
            }
            
            // Owner-only no-prefix commands work for owners OR users with noPrefix access
            if (noPrefixCommand.ownerOnly) {
              if (isOwner || hasNoPrefix) {
                commandName = noPrefixCommand.name; // Use the actual command name, not the alias
                args = parts;
                isNoPrefixCommand = true;
                if (isOwner) {
                  logger.info(`[NOPREFIX] ✅ Owner command accepted (user is owner): ${commandName}`);
                } else {
                  logger.info(`[NOPREFIX] ✅ Owner command accepted (user has noPrefix access): ${commandName}`);
                }
              } else {
                // User tried to use a noPrefix command but isn't authorized
                // Don't set commandName, so it will be ignored (user should use prefix instead)
                logger.warn(`[NOPREFIX] ❌ Owner command rejected: User ${userId} is not owner and doesn't have noPrefix access`);
                logger.warn(`[NOPREFIX] Expected OWNER_ID: "${ownerId}", Got: "${userId}"`);
                logger.warn(`[NOPREFIX] OWNER_ID length: ${ownerId.length}, User ID length: ${userId.length}`);
                logger.warn(`[NOPREFIX] Has noPrefix: ${hasNoPrefix}`);
                if (env.DEVELOPER_IDS && Array.isArray(env.DEVELOPER_IDS)) {
                  logger.warn(`[NOPREFIX] DEVELOPER_IDS: ${JSON.stringify(env.DEVELOPER_IDS)}`);
                }
                // Clear the noPrefixCommand so it doesn't interfere
                noPrefixCommand = undefined;
              }
            } 
            // Non-owner no-prefix commands work for users with no-prefix access
            else if (!noPrefixCommand.ownerOnly) {
              if (hasNoPrefix) {
                commandName = noPrefixCommand.name; // Use the actual command name, not the alias
                args = parts;
                isNoPrefixCommand = true;
                logger.info(`[NOPREFIX] ✅ NoPrefix command accepted: ${commandName}`);
              } else {
                logger.warn(`[NOPREFIX] ❌ NoPrefix command rejected: User doesn't have noPrefix access`);
                // Clear the noPrefixCommand so it doesn't interfere
                noPrefixCommand = undefined;
              }
            }
          } else {
            if (env.NODE_ENV === 'development') {
              logger.debug(`[NOPREFIX] No noPrefix command found for: ${potentialCommand}`);
            }
          }
        }
      }
    }

    // If no command found, handle DM logging and return
    if (!commandName) {
      // Log DMs that don't match any command
      if (!message.guild) {
        webhookService.sendDMLog(
          message.author.id,
          message.author.tag,
          message.content
        );
      }
      return;
    }

    // Find command by name or alias
    let command: Command | undefined;
    
    // If we found a noPrefix command, use it directly
    if (isNoPrefixCommand && noPrefixCommand) {
      command = noPrefixCommand;
    } else {
      // Look up command by name
      command = commands.get(commandName!);
      
      if (!command) {
        // Search by alias - iterate through all commands to find matching alias
        for (const [, cmd] of commands) {
          if (cmd.aliases && cmd.aliases.length > 0) {
            const aliasMatches = cmd.aliases.some(
              (alias) => alias.toLowerCase() === commandName?.toLowerCase()
            );
            if (aliasMatches) {
              command = cmd;
              break;
            }
          }
        }
      }
    }

    if (!command) {
      // Command not found, ignore silently (to avoid spam)
      // Log in development mode for debugging
      if (env.NODE_ENV === 'development') {
        logger.debug(`Command not found: ${commandName} (prefix: ${isPrefixCommand}, mention: ${isMentionCommand}, noPrefix: ${isNoPrefixCommand})`);
        logger.debug(`Available commands: ${Array.from(commands.keys()).join(', ')}`);
      }
      return;
    }

    // Check if command is blacklisted (non-blocking)
    try {
      if (client.commandBlacklist && client.commandBlacklist.has(commandName.toLowerCase())) {
        await message.reply({
          embeds: [embeds.error('Error', 'This command has been disabled.')],
        });
        return;
      }
    } catch (error) {
      // Continue if check fails - don't block commands
    }

    // Check if command supports message-based execution
    if (!command.supportsMessageCommands) {
      await message.reply({
        embeds: [
          embeds.warning(
            'Slash Command Only',
            `The command \`${command.name}\` is only available as a slash command. Please use \`/${command.name}\` instead.`
          ),
        ],
      });
      return;
    }

    // Check if command is guild-only
    if (command.guildOnly && !message.guild) {
      await message.reply({
        embeds: [embeds.error('Error', 'This command can only be used in a server.')],
      });
      return;
    }

    // Check owner-only commands
    if (command.ownerOnly) {
      const userId = message.author.id.trim();
      const ownerId = env.OWNER_ID || '';
      const isOwnerByOwnerId = ownerId.length > 0 && userId === ownerId;
      const isOwnerByDevIds = env.DEVELOPER_IDS && 
                             Array.isArray(env.DEVELOPER_IDS) && 
                             env.DEVELOPER_IDS.length > 0 && 
                             env.DEVELOPER_IDS.some(id => id.trim() === userId);
      const isOwner = isOwnerByOwnerId || isOwnerByDevIds;
      
      if (!isOwner) {
        await message.reply({
          embeds: [embeds.error('Error', 'This command can only be used by the bot owner.')],
        });
        return;
      }
    }

    // Check permissions
    if (command.permissions && message.member) {
      const member = message.member;
      if (!member.permissions.has(command.permissions)) {
        await message.reply({
          embeds: [embeds.error('Error', 'You do not have permission to use this command.')],
        });
        return;
      }
    }

    // Check cooldown
    const remainingCooldown = cooldownManager.checkCooldown(
      message.author.id,
      command.name,
      command.cooldown
    );

    if (remainingCooldown > 0) {
      const cooldownTime = cooldownManager.formatCooldown(remainingCooldown);
      await message.reply({
        embeds: [
          embeds.warning(
            'Command on Cooldown',
            `Please wait ${cooldownTime} before using this command again.`
          ),
        ],
      });
      return;
    }

    // Execute command
    try {
      await command.messageExecute({ message, args });
      logger.info(
        `Message command ${command.name} executed by ${message.author.tag}${message.guild ? ` in ${message.guild.name}` : ' (DM)'}`
      );

      // Send command log webhook
      if (message.guild) {
        webhookService.sendCommandLog(
          command.name,
          message.author.id,
          message.author.tag,
          message.guild.id,
          message.guild.name
        );
      }
    } catch (error) {
      errorHandler.handle(error, `Command: ${command.name}`);

      // Send error webhook
      webhookService.sendErrorLog(
        error instanceof Error ? error : new Error(String(error)),
        `Command: ${command.name}`
      );

      const errorEmbed = errorHandler.createErrorEmbed(error, 'Command Error');

      await message.reply({ embeds: [errorEmbed] }).catch(async (_replyError) => {
        // If we can't reply, try to send a DM
        try {
          await message.author.send({ embeds: [errorEmbed] });
        } catch (dmError: any) {
          // Only log if it's not a "DM disabled" error (50007)
          if (dmError.code !== 50007) {
            logger.error('Failed to send error message', dmError);
          } else {
            logger.debug(`Cannot send DM to ${message.author.tag} (DMs disabled)`);
          }
        }
      });
    }
  }
}

