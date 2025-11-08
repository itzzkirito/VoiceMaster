import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { colors, emojis } from './constants';

export const embeds = {
  success: (title: string, description?: string): EmbedBuilder => {
    const embed = new EmbedBuilder()
      .setColor(colors.success as ColorResolvable)
      .setTitle(`${emojis.success} ${title}`)
      .setTimestamp();

    if (description) embed.setDescription(description);
    return embed;
  },

  error: (title: string, description?: string): EmbedBuilder => {
    const embed = new EmbedBuilder()
      .setColor(colors.error as ColorResolvable)
      .setTitle(`${emojis.error} ${title}`)
      .setTimestamp();

    if (description) embed.setDescription(description);
    return embed;
  },

  warning: (title: string, description?: string): EmbedBuilder => {
    const embed = new EmbedBuilder()
      .setColor(colors.warning as ColorResolvable)
      .setTitle(`${emojis.warning} ${title}`)
      .setTimestamp();

    if (description) embed.setDescription(description);
    return embed;
  },

  info: (title: string, description?: string): EmbedBuilder => {
    const embed = new EmbedBuilder()
      .setColor(colors.info as ColorResolvable)
      .setTitle(`${emojis.info} ${title}`)
      .setTimestamp();

    if (description) embed.setDescription(description);
    return embed;
  },

  custom: (title: string, description?: string, color?: ColorResolvable): EmbedBuilder => {
    const embed = new EmbedBuilder()
      .setColor(color || colors.primary as ColorResolvable)
      .setTitle(title)
      .setTimestamp();

    if (description) embed.setDescription(description);
    return embed;
  },
};

