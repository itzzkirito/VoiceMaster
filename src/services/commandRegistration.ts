import { REST, Routes, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { env } from '../config/env.config';
import { logger } from '../utils/logger';
import { commands } from '../commands';

/**
 * Register slash commands with Discord API
 * @param guildId Optional guild ID for guild-specific commands (faster for development)
 * @returns Promise that resolves when commands are registered
 */
export async function registerCommands(guildId?: string): Promise<void> {
  try {
    if (!env.DISCORD_TOKEN || !env.CLIENT_ID) {
      logger.warn('Cannot register commands: DISCORD_TOKEN or CLIENT_ID is missing');
      return;
    }

    // Build command data from all loaded commands
    const commandData: RESTPostAPIApplicationCommandsJSONBody[] = [];
    
    for (const [, command] of commands) {
      try {
        const commandJSON = command.build().toJSON();
        commandData.push(commandJSON);
      } catch (error) {
        logger.error(`Failed to build command ${command.name}:`, error instanceof Error ? error : undefined);
      }
    }

    if (commandData.length === 0) {
      logger.warn('No commands to register');
      return;
    }

    logger.info(`Registering ${commandData.length} slash commands...`);

    const rest = new REST().setToken(env.DISCORD_TOKEN);

    if (guildId || env.GUILD_ID) {
      // Register to specific guild (faster for development, updates instantly)
      const targetGuildId = guildId || env.GUILD_ID;
      logger.info(`Registering commands to guild ${targetGuildId}...`);
      
      try {
        const data = await rest.put(
          Routes.applicationGuildCommands(env.CLIENT_ID, targetGuildId),
          { body: commandData }
        ) as unknown[];
        
        logger.info(`✅ Successfully registered ${data.length} guild commands to ${targetGuildId}`);
      } catch (error) {
        logger.error(`Failed to register guild commands:`, error instanceof Error ? error : undefined);
        throw error;
      }
    } else {
      // Register globally (takes up to 1 hour to propagate to all guilds)
      logger.info('Registering commands globally...');
      logger.warn('⚠️  Global command registration can take up to 1 hour to propagate. Consider using GUILD_ID for faster testing.');
      
      try {
        const data = await rest.put(
          Routes.applicationCommands(env.CLIENT_ID),
          { body: commandData }
        ) as unknown[];
        
        logger.info(`✅ Successfully registered ${data.length} global commands`);
      } catch (error) {
        logger.error(`Failed to register global commands:`, error instanceof Error ? error : undefined);
        throw error;
      }
    }
  } catch (error) {
    logger.error('Command registration failed:', error instanceof Error ? error : undefined);
    // Don't throw - allow bot to continue running even if registration fails
    // This is useful for development when Discord API might be temporarily unavailable
  }
}

/**
 * Clear all commands (useful for development/testing)
 * @param guildId Optional guild ID to clear guild-specific commands
 */
export async function clearCommands(guildId?: string): Promise<void> {
  try {
    if (!env.DISCORD_TOKEN || !env.CLIENT_ID) {
      logger.warn('Cannot clear commands: DISCORD_TOKEN or CLIENT_ID is missing');
      return;
    }

    const rest = new REST().setToken(env.DISCORD_TOKEN);

    if (guildId || env.GUILD_ID) {
      const targetGuildId = guildId || env.GUILD_ID;
      logger.info(`Clearing guild commands for ${targetGuildId}...`);
      await rest.put(
        Routes.applicationGuildCommands(env.CLIENT_ID, targetGuildId),
        { body: [] }
      );
      logger.info('✅ Cleared guild commands');
    } else {
      logger.info('Clearing all global commands...');
      await rest.put(
        Routes.applicationCommands(env.CLIENT_ID),
        { body: [] }
      );
      logger.info('✅ Cleared global commands');
    }
  } catch (error) {
    logger.error('Failed to clear commands:', error instanceof Error ? error : undefined);
  }
}

