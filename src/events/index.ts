import { Client } from 'discord.js';
import { logger } from '../utils/logger';

// Import all events
import ReadyEvent from './client/ready';
import InteractionCreateEvent from './client/interactionCreate';
import MessageCreateEvent from './client/messageCreate';
import VoiceStateUpdateEvent from './client/voiceStateUpdate';
import ShardEvent from './client/Shard';
import ChannelUpdateEvent from './channel/update';
import GuildCreateEvent from './guild/guildCreate';
import GuildDeleteEvent from './guild/guildDelete';

export function loadEvents(client: Client): void {
  const eventClasses = [
    ReadyEvent,
    InteractionCreateEvent,
    MessageCreateEvent,
    VoiceStateUpdateEvent,
    ShardEvent,
    ChannelUpdateEvent,
    GuildCreateEvent,
    GuildDeleteEvent,
  ];

  let loadedCount = 0;
  let errorCount = 0;
  const errors: Array<{ name: string; error: Error }> = [];

  for (const EventClass of eventClasses) {
    try {
      // Store class name for error reporting
      const className = EventClass?.name ?? 'Unknown';
      
      // Validate EventClass is a constructor
      if (typeof EventClass !== 'function') {
        const error = new Error(`Event class ${className} is not a constructor`);
        logger.error(`Invalid event class: ${className}`, error);
        errors.push({ name: className, error });
        errorCount++;
        continue;
      }

      const event = new EventClass();
      
      // Validate event structure
      if (!event.name || typeof event.name !== 'string') {
        const error = new Error(`Event ${className} has invalid or missing name`);
        logger.error(`Invalid event structure: ${className}`, error);
        errors.push({ name: className, error });
        errorCount++;
        continue;
      }

      if (typeof event.execute !== 'function') {
        const error = new Error(`Event ${event.name} has invalid or missing execute method`);
        logger.error(`Invalid event structure: ${event.name}`, error);
        errors.push({ name: event.name, error });
        errorCount++;
        continue;
      }

      // Create wrapped execute function with better error handling
      const execute = async (...args: unknown[]): Promise<void> => {
        try {
          // Handle both sync and async execute methods
          // Use apply to avoid spread operator type issues
          const result = (event.execute as (...args: unknown[]) => unknown).apply(event, args);
          if (result instanceof Promise) {
            await result;
          }
        } catch (error) {
          logger.error(`Error in event ${event.name}`, error instanceof Error ? error : undefined);
          // Don't rethrow - let the event system handle it
        }
      };

      // Register event
      if (event.once) {
        client.once(event.name, execute);
      } else {
        client.on(event.name, execute);
      }

      logger.info(`Loaded event: ${event.name}${event.once ? ' (once)' : ''}`);
      loadedCount++;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const className = EventClass?.name ?? 'Unknown';
      logger.error(`Failed to load event: ${className}`, err);
      errors.push({ name: className, error: err });
      errorCount++;
    }
  }

  logger.info(`✅ Events loaded: ${loadedCount} successful, ${errorCount} failed`);
  
  if (errors.length > 0 && process.env.NODE_ENV === 'development') {
    logger.warn('Event loading errors:', errors);
  }
}

