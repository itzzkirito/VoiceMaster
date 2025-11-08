import { Guild } from 'discord.js';
import { Event } from '../../structures/Event';
import { logger } from '../../utils/logger';
import { webhookService } from '../../services/webhookService';

export default class GuildDeleteEvent extends Event<'guildDelete'> {
  constructor() {
    super({
      name: 'guildDelete',
      once: false,
    });
  }

  async execute(guild: Guild) {
    logger.info(`Bot left guild: ${guild.name} (${guild.id})`);
    
    webhookService.sendGuildLeaveLog(
      guild.name,
      guild.id
    );
  }
}

