import { Events, Client } from 'discord.js';
import { Event } from '../../structures/Event';
import { logger } from '../../utils/logger';
import { webhookService } from '../../services/webhookService';

export default class ShardEvent extends Event<'ready'> {
  constructor() {
    super({
      name: 'ready',
      once: true,
    });
  }

  async execute(client: Client<true>) {
    // Register shard event listeners after bot is ready
    // Shard Ready
    client.on(Events.ShardReady, (shardId: number) => {
      this.logShardEvent(shardId, 'Ready', 0x00ff00, 'Shard is ready and connected');
    });

    // Shard Reconnecting
    client.on(Events.ShardReconnecting, (shardId: number) => {
      this.logShardEvent(shardId, 'Reconnecting', 0xffff00, 'Shard is reconnecting...');
    });

    // Shard Disconnected
    client.on(Events.ShardDisconnect, (closeEvent: any, shardId: number) => {
      this.logShardEvent(
        shardId,
        'Disconnected',
        0xff0000,
        `Shard disconnected (Code: ${closeEvent.code}, Reason: ${closeEvent.reason || 'None'})`
      );
    });

    // Shard Resumed
    client.on(Events.ShardResume, (shardId: number, replayedEvents: number) => {
      this.logShardEvent(
        shardId,
        'Resumed',
        0x00ffff,
        `Shard resumed connection (Replayed ${replayedEvents} events)`
      );
    });

    // Shard Error
    client.on(Events.ShardError, (error: Error, shardId: number) => {
      this.logShardEvent(
        shardId,
        'Error',
        0xff0000,
        `Shard encountered an error: ${error.message}`,
        error.stack
      );
    });

    logger.info('Shard monitoring initialized');
  }

  private async logShardEvent(
    shardId: number,
    eventName: string,
    color: number,
    description: string,
    errorDetails?: string
  ): Promise<void> {
    try {
      const logLevel = color === 0xff0000 ? 'error' : color === 0xffff00 ? 'warn' : 'info';

      logger[logLevel](`Shard ${shardId} ${eventName}: ${description}`);

      // Send to webhook if configured
      const message = `Shard ${shardId} ${eventName}: ${description}${
        errorDetails ? `\n\n**Error Details:**\n\`\`\`${errorDetails.substring(0, 500)}\`\`\`` : ''
      }`;
      webhookService.sendRuntimeLog(message, logLevel);
    } catch (error) {
      logger.error('Failed to log shard event:', error);
    }
  }
}

