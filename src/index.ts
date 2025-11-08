import { BotClient } from './client';
import { env } from './config/env.config';
import { logger } from './utils/logger';
import { loadCommands, commands } from './commands';
import { loadButtons, buttons } from './components/buttons';
import { loadMenus, menus } from './components/menus';
import { loadEvents } from './events';
import { connectDatabase, disconnectDatabase } from './services/database';
import { webhookService } from './services/webhookService';

// Initialize client
const client = new BotClient();

// Load commands
loadCommands();
client.commands = commands;

// Load buttons and menus
loadButtons(client);
client.buttons = buttons;

loadMenus(client);
client.menus = menus;

// Load events
loadEvents(client);

// Connect to database
connectDatabase().catch((error) => {
  logger.error('Failed to connect to database', error);
  // Don't exit - bot can still work without database
});

// Handle unhandled errors
process.on('unhandledRejection', (error: Error) => {
  logger.error('Unhandled Promise Rejection', error);
  webhookService.sendNodeErrorLog(error, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', error);
  webhookService.sendNodeErrorLog(error, 'Uncaught Exception');
  process.exit(1);
});

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Shutting down gracefully... (${signal})`);
  
  try {
    await webhookService.sendDestroyLog(`${signal} received`);
  } catch (error) {
    logger.error('Error sending destroy log', error instanceof Error ? error : undefined);
  }

  try {
    client.destroy();
  } catch (error) {
    logger.error('Error destroying client', error instanceof Error ? error : undefined);
  }

  try {
    await disconnectDatabase();
  } catch (error) {
    logger.error('Error disconnecting database', error instanceof Error ? error : undefined);
  }

  // Cleanup cache and cooldown manager if needed
  try {
    const { cooldownManager } = await import('./utils/cooldownManager');
    cooldownManager.destroy();
  } catch (error) {
    // Ignore errors during cleanup
  }

  // Disconnect cache
  try {
    const { cache } = await import('./services/cache');
    await cache.disconnect();
  } catch (error) {
    logger.error('Error disconnecting cache', error instanceof Error ? error : undefined);
  }

  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start bot
client.login(env.DISCORD_TOKEN).catch((error) => {
  logger.error('Failed to login', error);
  process.exit(1);
});

