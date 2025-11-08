import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';

export default class VcRenameCommand extends Command {
  constructor() {
    super({
      name: 'vcrename',
      description: 'Rename your voice channel',
      category: 'voice',
      aliases: ['vrename'],
      cooldown: 3,
      permissions: [PermissionFlagsBits.ManageChannels],
      guildOnly: true,
      supportsMessageCommands: true,
      noPrefix: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('vcrename')
      .setDescription('Rename your voice channel')
      .addStringOption((option) =>
        option
          .setName('name')
          .setDescription('New channel name')
          .setRequired(true)
          .setMaxLength(100)
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

    const newName = interaction.options.getString('name', true);

    if (newName.length < 1 || newName.length > 100) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'Channel name must be between 1 and 100 characters.')],
        ephemeral: true,
      });
      return;
    }

    try {
      await currentVC.setName(newName, `Renamed by ${interaction.user.tag}`);

      await interaction.reply({
        embeds: [
          embeds.success(
            'Channel Renamed',
            `✏️ ${currentVC} has been renamed to "${newName}"`
          ),
        ],
      });
    } catch (error) {
      console.error('VcRename error:', error);
      await interaction.reply({
        embeds: [embeds.error('Error', 'Failed to rename channel. Please check my permissions.')],
        ephemeral: true,
      });
    }
  }

  override async messageExecute({ message, args }: MessageCommandArgs): Promise<void> {
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

    const newName = args.join(' ');

    if (!newName || newName.length < 1 || newName.length > 100) {
      await message.reply({
        embeds: [
          embeds.error(
            'Invalid Name',
            'Please provide a valid channel name (1-100 characters).'
          ),
        ],
      });
      return;
    }

    try {
      await currentVC.setName(newName, `Renamed by ${message.author.tag}`);

      await message.reply({
        embeds: [
          embeds.success(
            'Channel Renamed',
            `✏️ ${currentVC} has been renamed to "${newName}"`
          ),
        ],
      });
    } catch (error) {
      console.error('VcRename error:', error);
      await message.reply({
        embeds: [embeds.error('Error', 'Failed to rename channel. Please check my permissions.')],
      });
    }
  }
}

