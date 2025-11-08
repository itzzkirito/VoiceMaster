import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';

export default class VcKickCommand extends Command {
  constructor() {
    super({
      name: 'vckick',
      description: 'Kick a user from voice channel',
      category: 'voice',
      aliases: ['vkick'],
      cooldown: 3,
      permissions: [PermissionFlagsBits.MoveMembers],
      guildOnly: true,
      supportsMessageCommands: true,
      noPrefix: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('vckick')
      .setDescription('Kick a user from voice channel')
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The user to kick')
          .setRequired(true)
      );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'This command can only be used in a server.')],
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'User not found.')],
        ephemeral: true,
      });
      return;
    }

    if (!targetMember.voice.channel) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'User is not in a voice channel.')],
        ephemeral: true,
      });
      return;
    }

    try {
      await targetMember.voice.disconnect(`Kicked by ${interaction.user.tag}`);

      await interaction.reply({
        embeds: [
          embeds.success(
            'User Kicked',
            `👢 ${targetMember} has been kicked from voice`
          ),
        ],
      });
    } catch (error) {
      console.error('VcKick error:', error);
      await interaction.reply({
        embeds: [embeds.error('Error', 'Failed to kick user. Please check my permissions.')],
        ephemeral: true,
      });
    }
  }

  override async messageExecute({ message, args: _args }: MessageCommandArgs): Promise<void> {
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

    const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await message.reply({
        embeds: [embeds.error('Error', 'User not found.')],
      });
      return;
    }

    if (!targetMember.voice.channel) {
      await message.reply({
        embeds: [embeds.error('Error', 'User is not in a voice channel.')],
      });
      return;
    }

    try {
      await targetMember.voice.disconnect(`Kicked by ${message.author.tag}`);

      await message.reply({
        embeds: [
          embeds.success(
            'User Kicked',
            `👢 ${targetMember} has been kicked from voice`
          ),
        ],
      });
    } catch (error) {
      console.error('VcKick error:', error);
      await message.reply({
        embeds: [embeds.error('Error', 'Failed to kick user. Please check my permissions.')],
      });
    }
  }
}

