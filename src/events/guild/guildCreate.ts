import { Guild } from 'discord.js';
import { Event } from '../../structures/Event';
import { logger } from '../../utils/logger';
import { webhookService } from '../../services/webhookService';

export default class GuildCreateEvent extends Event<'guildCreate'> {
  constructor() {
    super({
      name: 'guildCreate',
      once: false,
    });
  }

  async execute(guild: Guild) {
    logger.info(`Bot joined guild: ${guild.name} (${guild.id})`);
    
    webhookService.sendGuildJoinLog(
      guild.name,
      guild.id,
      guild.memberCount || 0
    );
  }
}

