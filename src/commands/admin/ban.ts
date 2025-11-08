import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';

export default class BanCommand extends Command {
  constructor() {
    super({
      name: 'ban',
      description: 'Ban a member from the server',
      category: 'admin',
      permissions: [PermissionFlagsBits.BanMembers],
      guildOnly: true,
      noPrefix: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a member from the server')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('The user to ban')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for the ban')
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option
          .setName('days')
          .setDescription('Number of days of messages to delete')
          .setRequired(false)
          .setMinValue(0)
          .setMaxValue(7)
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
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days = interaction.options.getInteger('days') || 0;

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'User not found in this server.')],
        ephemeral: true,
      });
      return;
    }

    if (!targetMember.bannable) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'I cannot ban this user.')],
        ephemeral: true,
      });
      return;
    }

    try {
      await targetMember.ban({ reason, deleteMessageDays: days });
      await interaction.reply({
        embeds: [embeds.success('User Banned', `**${targetUser.tag}** has been banned.\n**Reason:** ${reason}`)],
      });
    } catch (error) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'Failed to ban the user.')],
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
        embeds: [embeds.error('Error', 'Please mention a user to ban.')],
      });
      return;
    }

    // Extract reason (everything after the mention)
    // Remove the mention from args and join the rest as reason
    const mentionRegex = new RegExp(`<@!?${targetUser.id}>`, 'g');
    const contentWithoutMention = message.content.replace(mentionRegex, '').replace(/^!ban\s+/i, '').trim();
    const reason = contentWithoutMention || 'No reason provided';

    const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await message.reply({
        embeds: [embeds.error('Error', 'User not found in this server.')],
      });
      return;
    }

    if (!targetMember.bannable) {
      await message.reply({
        embeds: [embeds.error('Error', 'I cannot ban this user.')],
      });
      return;
    }

    try {
      await targetMember.ban({ reason });
      await message.reply({
        embeds: [embeds.success('User Banned', `**${targetUser.tag}** has been banned.\n**Reason:** ${reason}`)],
      });
    } catch (error) {
      await message.reply({
        embeds: [embeds.error('Error', 'Failed to ban the user.')],
      });
    }
  }
}

