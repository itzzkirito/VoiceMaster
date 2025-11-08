import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';

export default class VcAllowCommand extends Command {
  constructor() {
    super({
      name: 'vcallow',
      description: 'Allow a user to join your voice channel',
      category: 'voice',
      aliases: ['vallow'],
      cooldown: 3,
      permissions: [PermissionFlagsBits.ManageChannels],
      guildOnly: true,
      supportsMessageCommands: true,
      noPrefix: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('vcallow')
      .setDescription('Allow a user to join your voice channel')
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The user to allow')
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

    try {
      await currentVC.permissionOverwrites.edit(targetMember, {
        Connect: true,
      });

      await interaction.reply({
        embeds: [
          embeds.success(
            'User Allowed',
            `✅ ${targetMember} can now join ${currentVC}`
          ),
        ],
      });
    } catch (error) {
      console.error('VcAllow error:', error);
      await interaction.reply({
        embeds: [embeds.error('Error', 'Failed to allow user. Please check my permissions.')],
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
        embeds: [embeds.error('Error', 'Please mention a user to allow.')],
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

    try {
      await currentVC.permissionOverwrites.edit(targetMember, {
        Connect: true,
      });

      await message.reply({
        embeds: [
          embeds.success(
            'User Allowed',
            `✅ ${targetMember} can now join ${currentVC}`
          ),
        ],
      });
    } catch (error) {
      console.error('VcAllow error:', error);
      await message.reply({
        embeds: [embeds.error('Error', 'Failed to allow user. Please check my permissions.')],
      });
    }
  }
}

