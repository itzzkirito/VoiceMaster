import { REST, Routes } from 'discord.js';
import { env } from './config/env.config';
import { logger } from './utils/logger';
import { loadCommands, commands } from './commands';

async function deployCommands() {
  try {
    logger.info('Loading commands...');
    loadCommands();

    const commandData = commands.map(command => command.build().toJSON());

    logger.info(`Deploying ${commandData.length} commands...`);

    const rest = new REST().setToken(env.DISCORD_TOKEN);

    if (env.GUILD_ID) {
      // Deploy to specific guild (faster for development)
      logger.info(`Deploying commands to guild ${env.GUILD_ID}...`);
      await rest.put(
        Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID),
        { body: commandData }
      );
      logger.info('Successfully deployed guild commands!');
    } else {
      // Deploy globally (takes up to 1 hour to propagate)
      logger.info('Deploying commands globally...');
      await rest.put(
        Routes.applicationCommands(env.CLIENT_ID),
        { body: commandData }
      );
      logger.info('Successfully deployed global commands!');
    }
  } catch (error) {
    logger.error('Failed to deploy commands', error instanceof Error ? error : undefined);
    process.exit(1);
  }
}

deployCommands();

