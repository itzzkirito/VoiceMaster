import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';

export default class VcHideCommand extends Command {
  constructor() {
    super({
      name: 'vchide',
      description: 'Hide your voice channel from others',
      category: 'voice',
      aliases: ['vhide'],
      cooldown: 3,
      permissions: [PermissionFlagsBits.ManageChannels],
      guildOnly: true,
      supportsMessageCommands: true,
      noPrefix: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('vchide')
      .setDescription('Hide your voice channel from others');
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

    try {
      await currentVC.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        ViewChannel: false,
      });

      await interaction.reply({
        embeds: [
          embeds.success(
            'Channel Hidden',
            `👻 ${currentVC} is now hidden from view`
          ),
        ],
      });
    } catch (error) {
      console.error('VcHide error:', error);
      await interaction.reply({
        embeds: [embeds.error('Error', 'Failed to hide channel. Please check my permissions.')],
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

    try {
      await currentVC.permissionOverwrites.edit(message.guild.roles.everyone, {
        ViewChannel: false,
      });

      await message.reply({
        embeds: [
          embeds.success(
            'Channel Hidden',
            `👻 ${currentVC} is now hidden from view`
          ),
        ],
      });
    } catch (error) {
      console.error('VcHide error:', error);
      await message.reply({
        embeds: [embeds.error('Error', 'Failed to hide channel. Please check my permissions.')],
      });
    }
  }
}

