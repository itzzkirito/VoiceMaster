import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';

export default class MuteCommand extends Command {
  constructor() {
    super({
      name: 'mute',
      description: 'Mute a member in the server',
      category: 'admin',
      permissions: [PermissionFlagsBits.ModerateMembers],
      guildOnly: true,
      noPrefix: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('mute')
      .setDescription('Mute a member in the server')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('The user to mute')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName('duration')
          .setDescription('Duration in minutes (max 40320)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(40320)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for the mute')
          .setRequired(false)
      );
  }

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'This command can only be used in a server.')],
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const duration = interaction.options.getInteger('duration') || 60;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'User not found in this server.')],
        ephemeral: true,
      });
      return;
    }

    if (!targetMember.moderatable) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'I cannot mute this user.')],
        ephemeral: true,
      });
      return;
    }

    try {
      await targetMember.timeout(duration * 60 * 1000, reason);
      await interaction.reply({
        embeds: [embeds.success('User Muted', `**${targetUser.tag}** has been muted for ${duration} minutes.\n**Reason:** ${reason}`)],
      });
    } catch (error) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'Failed to mute the user.')],
        ephemeral: true,
      });
    }
  }

  override async messageExecute({ message, args: _args }: MessageCommandArgs) {
    if (!message.guild || !message.member) {
      await message.reply({
        embeds: [embeds.error('Error', 'This command can only be used in a server.')],
      });
      return;
    }

    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      await message.reply({
        embeds: [embeds.error('Error', 'Please mention a user to mute.')],
      });
      return;
    }

    // Parse duration and reason from content
    // Format: !mute @user [duration] [reason]
    const mentionRegex = new RegExp(`<@!?${targetUser.id}>`, 'g');
    const contentWithoutMention = message.content.replace(mentionRegex, '').replace(/^!mute\s+/i, '').trim();
    const partsAfterMention = contentWithoutMention.split(/\s+/).filter(p => p.length > 0);
    
    let duration = 60; // Default 60 minutes
    let reason = 'No reason provided';

    // Try to parse duration (first number after mention)
    if (partsAfterMention.length > 0) {
      const firstArg = partsAfterMention[0];
      if (firstArg) {
        const parsedDuration = parseInt(firstArg, 10);
        if (!isNaN(parsedDuration) && parsedDuration > 0) {
          duration = Math.min(parsedDuration, 40320); // Max 40320 minutes
          // Everything after duration is the reason
          if (partsAfterMention.length > 1) {
            reason = partsAfterMention.slice(1).join(' ');
          }
        } else {
          // No duration provided, everything is the reason
          reason = partsAfterMention.join(' ');
        }
      } else {
        // No first arg, everything is the reason
        reason = partsAfterMention.join(' ');
      }
    }

    const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await message.reply({
        embeds: [embeds.error('Error', 'User not found in this server.')],
      });
      return;
    }

    if (!targetMember.moderatable) {
      await message.reply({
        embeds: [embeds.error('Error', 'I cannot mute this user.')],
      });
      return;
    }

    try {
      await targetMember.timeout(duration * 60 * 1000, reason);
      await message.reply({
        embeds: [embeds.success('User Muted', `**${targetUser.tag}** has been muted for ${duration} minutes.\n**Reason:** ${reason}`)],
      });
    } catch (error) {
      await message.reply({
        embeds: [embeds.error('Error', 'Failed to mute the user.')],
      });
    }
  }
}

