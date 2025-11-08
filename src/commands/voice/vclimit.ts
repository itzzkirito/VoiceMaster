import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';

export default class VcLimitCommand extends Command {
  constructor() {
    super({
      name: 'vclimit',
      description: 'Set user limit for your voice channel (0 = unlimited)',
      category: 'voice',
      aliases: ['vlimit'],
      cooldown: 3,
      permissions: [PermissionFlagsBits.ManageChannels],
      guildOnly: true,
      supportsMessageCommands: true,
      noPrefix: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('vclimit')
      .setDescription('Set user limit for your voice channel (0 = unlimited)')
      .addIntegerOption((option) =>
        option
          .setName('limit')
          .setDescription('User limit (0-99, 0 = unlimited)')
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(99)
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

    const limit = interaction.options.getInteger('limit', true);

    try {
      await currentVC.setUserLimit(limit);

      await interaction.reply({
        embeds: [
          embeds.success(
            'Limit Set',
            `👥 User limit set to ${limit === 0 ? 'unlimited' : limit} for ${currentVC}`
          ),
        ],
      });
    } catch (error) {
      console.error('VcLimit error:', error);
      await interaction.reply({
        embeds: [embeds.error('Error', 'Failed to set limit. Please check my permissions.')],
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

    const limitArg = args[0];
    if (!limitArg) {
      await message.reply({
        embeds: [
          embeds.error(
            'Invalid Limit',
            'Please provide a valid limit between 0 and 99 (0 = unlimited).'
          ),
        ],
      });
      return;
    }

    const limit = parseInt(limitArg);
    if (isNaN(limit) || limit < 0 || limit > 99) {
      await message.reply({
        embeds: [
          embeds.error(
            'Invalid Limit',
            'Please provide a valid limit between 0 and 99 (0 = unlimited).'
          ),
        ],
      });
      return;
    }

    try {
      await currentVC.setUserLimit(limit);

      await message.reply({
        embeds: [
          embeds.success(
            'Limit Set',
            `👥 User limit set to ${limit === 0 ? 'unlimited' : limit} for ${currentVC}`
          ),
        ],
      });
    } catch (error) {
      console.error('VcLimit error:', error);
      await message.reply({
        embeds: [embeds.error('Error', 'Failed to set limit. Please check my permissions.')],
      });
    }
  }
}

