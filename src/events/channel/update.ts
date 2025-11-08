import { Channel, GuildBasedChannel, VoiceChannel } from 'discord.js';
import { Event } from '../../structures/Event';
import { logger } from '../../utils/logger';
import { webhookService } from '../../services/webhookService';

export default class ChannelUpdateEvent extends Event<'channelUpdate'> {
  constructor() {
    super({
      name: 'channelUpdate',
      once: false,
    });
  }

  async execute(oldChannel: Channel, newChannel: Channel) {
    try {
      // Only process guild channels (not DMs)
      if (oldChannel.isDMBased() || newChannel.isDMBased()) return;
      if (!oldChannel.guild || !newChannel.guild) return;

      // Log significant changes
      const changes: string[] = [];

      if (oldChannel.isTextBased() && newChannel.isTextBased() && !oldChannel.isDMBased() && !newChannel.isDMBased()) {
        const oldGuildChannel = oldChannel as GuildBasedChannel;
        const newGuildChannel = newChannel as GuildBasedChannel;
        
        if ('name' in oldGuildChannel && 'name' in newGuildChannel) {
          if (oldGuildChannel.name !== newGuildChannel.name) {
            changes.push(`Name: ${oldGuildChannel.name} → ${newGuildChannel.name}`);
          }
        }
        if (oldGuildChannel.parentId !== newGuildChannel.parentId) {
          changes.push(`Category changed`);
        }
      }

      if (oldChannel.isVoiceBased() && newChannel.isVoiceBased() && !oldChannel.isDMBased() && !newChannel.isDMBased()) {
        const oldVoiceChannel = oldChannel as VoiceChannel;
        const newVoiceChannel = newChannel as VoiceChannel;
        
        if (oldVoiceChannel.name !== newVoiceChannel.name) {
          changes.push(`Name: ${oldVoiceChannel.name} → ${newVoiceChannel.name}`);
        }
        if (oldVoiceChannel.userLimit !== newVoiceChannel.userLimit) {
          changes.push(
            `User limit: ${oldVoiceChannel.userLimit || 'unlimited'} → ${newVoiceChannel.userLimit || 'unlimited'}`
          );
        }
        if (oldVoiceChannel.parentId !== newVoiceChannel.parentId) {
          changes.push(`Category changed`);
        }
      }

      if (changes.length > 0) {
        logger.info(
          `Channel updated: ${newChannel.id} in guild ${newChannel.guild.id} - ${changes.join(', ')}`
        );

        // Log to webhook if configured
        webhookService.sendRuntimeLog(
          `Channel Updated - **Channel:** ${newChannel.toString()}\n**Guild:** ${newChannel.guild.name} (${newChannel.guild.id})\n**Changes:**\n${changes.map((c) => `- ${c}`).join('\n')}`,
          'info'
        );
      }
    } catch (error) {
      logger.error('Error in channelUpdate event:', error);
    }
  }
}

