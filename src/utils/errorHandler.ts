import { logger } from './logger';
import { EmbedBuilder } from 'discord.js';
import { colors, emojis } from './constants';
import { webhookService } from '../services/webhookService';

export class BotError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly userMessage?: string
  ) {
    super(message);
    this.name = 'BotError';
  }
}

export const errorHandler = {
  handle(error: unknown, context?: string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(`Error${context ? ` in ${context}` : ''}: ${errorMessage}`, error instanceof Error ? error : undefined);

    // Send to webhook
    if (error instanceof Error) {
      webhookService.sendErrorLog(error, context);
    } else {
      webhookService.sendErrorLog(new Error(String(error)), context);
    }

    if (errorStack && process.env.NODE_ENV === 'development') {
      console.error(errorStack);
    }
  },

  createErrorEmbed(error: unknown, title = 'An Error Occurred'): EmbedBuilder {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const userMessage = error instanceof BotError 
      ? (error.userMessage ?? 'Something went wrong. Please try again later.')
      : 'Something went wrong. Please try again later.';

    return new EmbedBuilder()
      .setColor(colors.error)
      .setTitle(`${emojis.error} ${title}`)
      .setDescription(userMessage)
      .setTimestamp()
        .setFooter({ text: (errorMessage ?? 'Unknown error').substring(0, 100) });
  },
};

