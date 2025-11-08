import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';

export default class VcMoveAllCommand extends Command {
  constructor() {
    super({
      name: 'vcmoveall',
      description: 'Move all users from your voice channel to another',
      category: 'voice',
      aliases: ['vmoveall'],
      cooldown: 5,
      permissions: [PermissionFlagsBits.MoveMembers],
      guildOnly: true,
      supportsMessageCommands: true,
      noPrefix: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('vcmoveall')
      .setDescription('Move all users from your voice channel to another')
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription('Target voice channel')
          .addChannelTypes(ChannelType.GuildVoice)
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

    const targetChannel = interaction.options.getChannel('channel', true);

    if (targetChannel.type !== ChannelType.GuildVoice) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'Target channel must be a voice channel.')],
        ephemeral: true,
      });
      return;
    }

    const members = currentVC.members.filter((m) => m.id !== member.id);

    if (members.size === 0) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'There are no other users in your voice channel.')],
        ephemeral: true,
      });
      return;
    }

    try {
      const promises = members.map((m) =>
        m.voice.setChannel(targetChannel.id, `Moved all by ${interaction.user.tag}`).catch(() => {})
      );
      await Promise.all(promises);

      await interaction.reply({
        embeds: [
          embeds.success(
            'Users Moved',
            `➡️ Moved ${members.size} user(s) from ${currentVC} to ${targetChannel}`
          ),
        ],
      });
    } catch (error) {
      console.error('VcMoveAll error:', error);
      await interaction.reply({
        embeds: [embeds.error('Error', 'Failed to move users. Please check my permissions.')],
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

    const channelMention = message.mentions.channels.first();
    if (!channelMention || channelMention.type !== ChannelType.GuildVoice) {
      await message.reply({
        embeds: [embeds.error('Error', 'Please mention a valid voice channel.')],
      });
      return;
    }

    const members = currentVC.members.filter((m) => m.id !== member.id);

    if (members.size === 0) {
      await message.reply({
        embeds: [embeds.error('Error', 'There are no other users in your voice channel.')],
      });
      return;
    }

    try {
      const promises = members.map((m) =>
        m.voice.setChannel(channelMention.id, `Moved all by ${message.author.tag}`).catch(() => {})
      );
      await Promise.all(promises);

      await message.reply({
        embeds: [
          embeds.success(
            'Users Moved',
            `➡️ Moved ${members.size} user(s) from ${currentVC} to ${channelMention}`
          ),
        ],
      });
    } catch (error) {
      console.error('VcMoveAll error:', error);
      await message.reply({
        embeds: [embeds.error('Error', 'Failed to move users. Please check my permissions.')],
      });
    }
  }
}

