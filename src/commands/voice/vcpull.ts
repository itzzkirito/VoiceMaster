import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';

export default class VcPullCommand extends Command {
  constructor() {
    super({
      name: 'vcpull',
      description: 'Pull a user to your voice channel',
      category: 'voice',
      aliases: ['vpull'],
      cooldown: 3,
      permissions: [PermissionFlagsBits.MoveMembers],
      guildOnly: true,
      supportsMessageCommands: true,
      noPrefix: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('vcpull')
      .setDescription('Pull a user to your voice channel')
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The user to pull')
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

    const member = await interaction.guild.members.fetch(interaction.member.user.id);
    const currentVC = member.voice.channel;

    if (!currentVC) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'You must be in a voice channel to use this command.')],
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

    if (targetMember.voice.channel?.id === currentVC.id) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'User is already in your voice channel.')],
        ephemeral: true,
      });
      return;
    }

    try {
      await targetMember.voice.setChannel(currentVC.id, `Pulled by ${interaction.user.tag}`);

      await interaction.reply({
        embeds: [
          embeds.success(
            'User Pulled',
            `⬇️ ${targetMember} has been pulled to ${currentVC}`
          ),
        ],
      });
    } catch (error) {
      console.error('VcPull error:', error);
      await interaction.reply({
        embeds: [embeds.error('Error', 'Failed to pull user. Please check my permissions.')],
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

    const member = await message.guild.members.fetch(message.author.id);
    const currentVC = member.voice.channel;

    if (!currentVC) {
      await message.reply({
        embeds: [embeds.error('Error', 'You must be in a voice channel to use this command.')],
      });
      return;
    }

    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      await message.reply({
        embeds: [embeds.error('Error', 'Please mention a user to pull.')],
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

    if (targetMember.voice.channel?.id === currentVC.id) {
      await message.reply({
        embeds: [embeds.error('Error', 'User is already in your voice channel.')],
      });
      return;
    }

    try {
      await targetMember.voice.setChannel(currentVC.id, `Pulled by ${message.author.tag}`);

      await message.reply({
        embeds: [
          embeds.success(
            'User Pulled',
            `⬇️ ${targetMember} has been pulled to ${currentVC}`
          ),
        ],
      });
    } catch (error) {
      console.error('VcPull error:', error);
      await message.reply({
        embeds: [embeds.error('Error', 'Failed to pull user. Please check my permissions.')],
      });
    }
  }
}

