import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { Command } from './structures/Command';
import { Button } from './structures/Button';
import { Menu } from './structures/Menu';
import { logger } from './utils/logger';
import { webhookService } from './services/webhookService';

import { PresenceManager } from './utils/presenceManager';

export class BotClient extends Client {
  public commands: Collection<string, Command> = new Collection();
  public buttons: Collection<string, Button> = new Collection();
  public menus: Collection<string, Menu> = new Collection();
  public aliases: Collection<string, string> = new Collection();
  public noPrefixUsers: Set<string> = new Set();
  public commandBlacklist: Set<string> = new Set();
  public guildPrefixes: Collection<string, string> = new Collection(); // Cache for guild-specific prefixes
  public presenceManager?: PresenceManager;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });

    // Handle disconnect
    this.on('disconnect', () => {
      logger.warn('Bot disconnected from Discord');
      webhookService.sendConnectionLog('Bot disconnected from Discord', 'disconnect');
    });

    // Handle reconnect
    this.on('reconnecting', () => {
      logger.info('Bot reconnecting to Discord...');
      webhookService.sendConnectionLog('Bot reconnecting to Discord...', 'reconnect');
    });

    // Handle error
    this.on('error', (error) => {
      logger.error('Discord client error', error);
      webhookService.sendNodeErrorLog(error, 'Discord Client Error');
    });
  }

  override async login(token: string): Promise<string> {
    logger.info('Logging in to Discord...');
    const result = await super.login(token);
    return result;
  }
}

