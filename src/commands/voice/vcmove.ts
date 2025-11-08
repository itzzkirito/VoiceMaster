import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';

export default class VcMoveCommand extends Command {
  constructor() {
    super({
      name: 'vcmove',
      description: 'Move a user to a different voice channel',
      category: 'voice',
      aliases: ['vmove'],
      cooldown: 3,
      permissions: [PermissionFlagsBits.MoveMembers],
      guildOnly: true,
      supportsMessageCommands: true,
      noPrefix: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('vcmove')
      .setDescription('Move a user to a different voice channel')
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The user to move')
          .setRequired(true)
      )
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription('Target voice channel (default: your current channel)')
          .addChannelTypes(ChannelType.GuildVoice)
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
    const targetChannel =
      interaction.options.getChannel('channel') ||
      (await interaction.guild.members.fetch(interaction.member.user.id)).voice.channel;

    if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'Invalid voice channel.')],
        ephemeral: true,
      });
      return;
    }

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
      await targetMember.voice.setChannel(
        targetChannel.id,
        `Moved by ${interaction.user.tag}`
      );

      await interaction.reply({
        embeds: [
          embeds.success(
            'User Moved',
            `➡️ ${targetMember} has been moved to ${targetChannel}`
          ),
        ],
      });
    } catch (error) {
      console.error('VcMove error:', error);
      await interaction.reply({
        embeds: [embeds.error('Error', 'Failed to move user. Please check my permissions.')],
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
        embeds: [embeds.error('Error', 'Please mention a user to move.')],
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

    // Get target channel from mention or use author's channel
    const channelMention = message.mentions.channels.first();
    const member = await message.guild.members.fetch(message.author.id);
    const targetChannel = channelMention || member.voice.channel;

    if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
      await message.reply({
        embeds: [embeds.error('Error', 'Invalid voice channel.')],
      });
      return;
    }

    try {
      await targetMember.voice.setChannel(targetChannel.id, `Moved by ${message.author.tag}`);

      await message.reply({
        embeds: [
          embeds.success(
            'User Moved',
            `➡️ ${targetMember} has been moved to ${targetChannel}`
          ),
        ],
      });
    } catch (error) {
      console.error('VcMove error:', error);
      await message.reply({
        embeds: [embeds.error('Error', 'Failed to move user. Please check my permissions.')],
      });
    }
  }
}

