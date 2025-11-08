import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';

export default class KickCommand extends Command {
  constructor() {
    super({
      name: 'kick',
      description: 'Kick a member from the server',
      category: 'admin',
      permissions: [PermissionFlagsBits.KickMembers],
      guildOnly: true,
      noPrefix: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a member from the server')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('The user to kick')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for the kick')
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
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'User not found in this server.')],
        ephemeral: true,
      });
      return;
    }

    if (!targetMember.kickable) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'I cannot kick this user.')],
        ephemeral: true,
      });
      return;
    }

    try {
      await targetMember.kick(reason);
      await interaction.reply({
        embeds: [embeds.success('User Kicked', `**${targetUser.tag}** has been kicked.\n**Reason:** ${reason}`)],
      });
    } catch (error) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'Failed to kick the user.')],
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
        embeds: [embeds.error('Error', 'Please mention a user to kick.')],
      });
      return;
    }

    // Extract reason (everything after the mention)
    const mentionRegex = new RegExp(`<@!?${targetUser.id}>`, 'g');
    const contentWithoutMention = message.content.replace(mentionRegex, '').replace(/^!kick\s+/i, '').trim();
    const reason = contentWithoutMention || 'No reason provided';

    const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await message.reply({
        embeds: [embeds.error('Error', 'User not found in this server.')],
      });
      return;
    }

    if (!targetMember.kickable) {
      await message.reply({
        embeds: [embeds.error('Error', 'I cannot kick this user.')],
      });
      return;
    }

    try {
      await targetMember.kick(reason);
      await message.reply({
        embeds: [embeds.success('User Kicked', `**${targetUser.tag}** has been kicked.\n**Reason:** ${reason}`)],
      });
    } catch (error) {
      await message.reply({
        embeds: [embeds.error('Error', 'Failed to kick the user.')],
      });
    }
  }
}

