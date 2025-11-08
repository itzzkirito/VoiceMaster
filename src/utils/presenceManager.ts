import { PresenceData, ActivityType, ChannelType } from 'discord.js';
import { BotClient } from '../client';
import { botConfig } from '../config/bot.config';
import { logger } from './logger';

/**
 * Advanced Activity Configuration
 * Supports both static strings and dynamic functions
 */
export interface AdvancedActivity {
  name: string | ((guilds: number, users: number, commands: number) => string);
  type: ActivityType;
  url?: string;
}

/**
 * Advanced Presence Manager
 * Manages bot presence rotation with dynamic statistics and custom intervals
 */
export class PresenceManager {
  private client: BotClient;
  private rotationInterval: NodeJS.Timeout | null = null;
  private rotationIntervalMs: number;
  private currentActivityIndex: number = 0;
  private statsUpdateInterval: NodeJS.Timeout | null = null;
  private activities: AdvancedActivity[];

  constructor(client: BotClient, rotationIntervalMs: number = 60000, customActivities?: AdvancedActivity[]) {
    this.client = client;
    this.rotationIntervalMs = rotationIntervalMs;
    this.activities = customActivities || this.getDefaultActivities();
  }

  /**
   * Get default activities for the bot
   */
  private getDefaultActivities(): AdvancedActivity[] {
    return [
      {
        name: (guilds) => `${botConfig.prefix}help | ${guilds} servers`,
        type: ActivityType.Watching,
      },
      {
        name: (guilds, users) => `${guilds} servers | ${users.toLocaleString()} users`,
        type: ActivityType.Watching,
      },
      {
        name: `${botConfig.prefix}info for bot info`,
        type: ActivityType.Watching,
      },
      {
        name: 'VoiceMaster System',
        type: ActivityType.Playing,
      },
      {
        name: (_, __, commands) => `${commands} commands available`,
        type: ActivityType.Watching,
      },
      {
        name: (guilds) => `Serving ${guilds} communities`,
        type: ActivityType.Watching,
      },
    ];
  }

  /**
   * Start the presence rotation system
   */
  public start(): void {
    if (this.rotationInterval) {
      logger.warn('[PRESENCE] Rotation already started');
      return;
    }

    // Update presence immediately
    this.updatePresence();

    // Set up rotation interval
    this.rotationInterval = setInterval(() => {
      this.updatePresence();
    }, this.rotationIntervalMs);

    // Update stats every 5 minutes (presence stats update automatically but we log them)
    this.statsUpdateInterval = setInterval(() => {
      this.logStats();
    }, 5 * 60 * 1000);

    logger.info('[PRESENCE] Presence rotation started');
  }

  /**
   * Stop the presence rotation system
   */
  public stop(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
    }

    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
      this.statsUpdateInterval = null;
    }

    logger.info('[PRESENCE] Presence rotation stopped');
  }

  /**
   * Create dynamic presence with current statistics
   */
  private createDynamicPresence(): PresenceData {
    const stats = this.getStats();
    const guildCount = stats.guilds;
    const userCount = stats.users;
    const commandCount = stats.commands;

    // Cycle through activities
    const activityConfig = this.activities[this.currentActivityIndex % this.activities.length];
    this.currentActivityIndex = (this.currentActivityIndex + 1) % this.activities.length;

    // Safety check - if no activities configured, return default
    if (!activityConfig) {
      return {
        activities: [{ name: 'Discord Bot', type: ActivityType.Playing }],
        status: 'online',
      };
    }

    // Resolve activity name (support both string and function)
    const activityName =
      typeof activityConfig.name === 'function'
        ? activityConfig.name(guildCount, userCount, commandCount)
        : activityConfig.name;

    const activity: any = {
      name: activityName,
      type: activityConfig.type,
    };

    // Add URL for streaming activities
    if (activityConfig.url && activityConfig.type === ActivityType.Streaming) {
      activity.url = activityConfig.url;
    }

    return {
      activities: [activity],
      status: 'online',
    };
  }

  /**
   * Set custom activities
   */
  public setActivities(activities: AdvancedActivity[]): void {
    this.activities = activities;
    this.currentActivityIndex = 0;
    logger.info(`[PRESENCE] Activities updated to ${activities.length} items`);
  }

  /**
   * Update bot presence with current statistics
   */
  public updatePresence(): void {
    try {
      if (!this.client.user) {
        logger.warn('[PRESENCE] Client user not available');
        return;
      }

      const presence = this.createDynamicPresence();
      this.client.user.setPresence(presence);

      const activity = presence.activities?.[0];
      if (activity) {
        let activityTypeName = 'Unknown';
        switch (activity.type) {
          case ActivityType.Playing:
            activityTypeName = 'Playing';
            break;
          case ActivityType.Streaming:
            activityTypeName = 'Streaming';
            break;
          case ActivityType.Listening:
            activityTypeName = 'Listening';
            break;
          case ActivityType.Watching:
            activityTypeName = 'Watching';
            break;
          case ActivityType.Competing:
            activityTypeName = 'Competing';
            break;
          case ActivityType.Custom:
            activityTypeName = 'Custom';
            break;
          default:
            activityTypeName = String(activity.type);
        }
        logger.debug(
          `[PRESENCE] Updated to: ${activityTypeName} ${activity.name}${activity.url ? ` (${activity.url})` : ''}`
        );
      }
    } catch (error) {
      logger.error({ err: error }, '[PRESENCE] Error updating presence');
    }
  }

  /**
   * Manually set custom presence
   */
  public setCustomPresence(presence: PresenceData): void {
    try {
      if (!this.client.user) return;
      this.client.user.setPresence(presence);
      logger.info('[PRESENCE] Custom presence set');
    } catch (error) {
      logger.error({ err: error }, '[PRESENCE] Error setting custom presence');
    }
  }

  /**
   * Get current bot statistics
   */
  public getStats(): { guilds: number; users: number; commands: number; voiceChannels: number } {
    const guilds = this.client.guilds.cache.size || 0;
    const users = this.client.guilds.cache.reduce(
      (acc: number, guild) => acc + (guild.memberCount || 0),
      0
    );
    const commands = this.client.commands?.size || 0;
    const voiceChannels = this.client.guilds.cache.reduce(
      (acc: number, guild) => acc + (guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size || 0),
      0
    );

    return { guilds, users, commands, voiceChannels };
  }

  /**
   * Log current statistics
   */
  private logStats(): void {
    const stats = this.getStats();
    logger.info(
      `[PRESENCE] Stats - Guilds: ${stats.guilds}, Users: ${stats.users.toLocaleString()}, ` +
        `Commands: ${stats.commands}, Voice Channels: ${stats.voiceChannels}`
    );
  }

  /**
   * Cycle to next activity manually
   */
  public nextActivity(): void {
    this.updatePresence();
  }

  /**
   * Set rotation interval
   */
  public setRotationInterval(intervalMs: number): void {
    this.rotationIntervalMs = intervalMs;

    if (this.rotationInterval) {
      this.stop();
      this.start();
    }
  }
}

