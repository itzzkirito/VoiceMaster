import axios from 'axios';
import { EmbedBuilder } from 'discord.js';
import { env } from '../config/env.config';
import { logger } from '../utils/logger';

type WebhookEmbed = {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
  footer?: {
    text: string;
  };
  thumbnail?: {
    url: string;
  };
};

interface WebhookPayload {
  content?: string;
  embeds?: WebhookEmbed[];
  username?: string;
  avatar_url?: string;
}

class WebhookService {
  /**
   * Send a message to a webhook
   */
  private async sendWebhook(webhookUrl: string, payload: WebhookPayload): Promise<void> {
    if (!webhookUrl) {
      return; // Silently fail if webhook is not configured
    }

    try {
      await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });
    } catch (error) {
      // Don't log webhook errors to avoid spam, but log in development
      if (env.NODE_ENV === 'development') {
        logger.debug(`Failed to send webhook: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Send error log
   */
  async sendErrorLog(error: Error | string, context?: string): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    const embed: WebhookEmbed = {
      title: '❌ Error Log',
      description: `**Error:** ${errorMessage}`,
      color: 0xed4245, // Red
      fields: [],
      timestamp: new Date().toISOString(),
    };

    if (context) {
      embed.fields = embed.fields || [];
      embed.fields.push({
        name: 'Context',
        value: context,
        inline: false,
      });
    }

    if (errorStack) {
      embed.fields = embed.fields || [];
      embed.fields.push({
        name: 'Stack Trace',
        value: `\`\`\`${errorStack.substring(0, 1000)}\`\`\``,
        inline: false,
      });
    }

    await this.sendWebhook(env.ERROR_LOGS_HOOK, { embeds: [embed] });
  }

  /**
   * Send Node.js error log
   */
  async sendNodeErrorLog(error: Error | string, context?: string): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    const embed: WebhookEmbed = {
      title: '🔴 Node.js Error',
      description: `**Error:** ${errorMessage}`,
      color: 0xed4245,
      fields: [],
      timestamp: new Date().toISOString(),
    };

    if (context) {
      embed.fields = embed.fields || [];
      embed.fields.push({
        name: 'Context',
        value: context,
        inline: false,
      });
    }

    if (errorStack) {
      embed.fields = embed.fields || [];
      embed.fields.push({
        name: 'Stack Trace',
        value: `\`\`\`${errorStack.substring(0, 1000)}\`\`\``,
        inline: false,
      });
    }

    await this.sendWebhook(env.NODE_ERROR_LOGS_HOOK, { embeds: [embed] });
  }

  /**
   * Send connection log
   */
  async sendConnectionLog(message: string, type: 'connect' | 'disconnect' | 'reconnect' = 'connect'): Promise<void> {
    const webhookMap = {
      connect: env.NODE_CONNECTION_HOOK,
      disconnect: env.NODE_DISCONNECT_LOGS_HOOK,
      reconnect: env.NODE_RECONNECT_LOGS_HOOK,
    };

    const colorMap = {
      connect: 0x57f287, // Green
      disconnect: 0xfee75c, // Yellow
      reconnect: 0x5865f2, // Blue
    };

    const emojiMap = {
      connect: '🟢',
      disconnect: '🟡',
      reconnect: '🔵',
    };

    const embed = {
      title: `${emojiMap[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      description: message,
      color: colorMap[type],
      timestamp: new Date().toISOString(),
    };

    await this.sendWebhook(webhookMap[type], { embeds: [embed] });
  }

  /**
   * Send destroy log
   */
  async sendDestroyLog(reason: string): Promise<void> {
    const embed = {
      title: '🛑 Bot Destroyed',
      description: `**Reason:** ${reason}`,
      color: 0xed4245,
      timestamp: new Date().toISOString(),
    };

    await this.sendWebhook(env.NODE_DESTROY_LOGS_HOOK, { embeds: [embed] });
  }

  /**
   * Send guild join log
   */
  async sendGuildJoinLog(guildName: string, guildId: string, memberCount: number): Promise<void> {
    const embed = {
      title: '➕ Guild Joined',
      description: `**Guild:** ${guildName}\n**ID:** ${guildId}\n**Members:** ${memberCount}`,
      color: 0x57f287,
      timestamp: new Date().toISOString(),
    };

    await this.sendWebhook(env.GUILD_JOIN_LOGS_HOOK, { embeds: [embed] });
  }

  /**
   * Send guild leave log
   */
  async sendGuildLeaveLog(guildName: string, guildId: string): Promise<void> {
    const embed = {
      title: '➖ Guild Left',
      description: `**Guild:** ${guildName}\n**ID:** ${guildId}`,
      color: 0xfee75c,
      timestamp: new Date().toISOString(),
    };

    await this.sendWebhook(env.GUILD_LEAVE_LOGS_HOOK, { embeds: [embed] });
  }

  /**
   * Send command log
   */
  async sendCommandLog(
    commandName: string,
    userId: string,
    username: string,
    guildId?: string,
    guildName?: string
  ): Promise<void> {
    const embed: WebhookEmbed = {
      title: '⚡ Command Executed',
      description: `**Command:** \`/${commandName}\`\n**User:** ${username} (${userId})`,
      color: 0x5865f2,
      fields: [],
      timestamp: new Date().toISOString(),
    };

    embed.fields = embed.fields || [];
    if (guildId && guildName) {
      embed.fields.push({
        name: 'Guild',
        value: `${guildName} (${guildId})`,
        inline: true,
      });
    } else {
      embed.fields.push({
        name: 'Type',
        value: 'DM',
        inline: true,
      });
    }

    await this.sendWebhook(env.COMMAND_LOGS_HOOK, { embeds: [embed] });
  }

  /**
   * Send runtime log
   */
  async sendRuntimeLog(message: string, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
    const colorMap = {
      info: 0x5865f2,
      warn: 0xfee75c,
      error: 0xed4245,
    };

    const emojiMap = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    };

    const embed = {
      title: `${emojiMap[level]} Runtime Log`,
      description: message,
      color: colorMap[level],
      timestamp: new Date().toISOString(),
    };

    await this.sendWebhook(env.RUNTIME_LOGS_HOOK, { embeds: [embed] });
  }

  /**
   * Send DM log
   */
  async sendDMLog(userId: string, username: string, message: string): Promise<void> {
    const embed = {
      title: '💬 DM Received',
      description: `**From:** ${username} (${userId})\n**Message:** ${message.substring(0, 1000)}`,
      color: 0x5865f2,
      timestamp: new Date().toISOString(),
    };

    await this.sendWebhook(env.DM_LOGS_HOOK, { embeds: [embed] });
  }

  /**
   * Send custom embed
   */
  async sendCustomEmbed(webhookUrl: string, embed: EmbedBuilder | object): Promise<void> {
    const embedData = embed instanceof EmbedBuilder ? embed.toJSON() : embed;
    await this.sendWebhook(webhookUrl, { embeds: [embedData] });
  }
}

export const webhookService = new WebhookService();

