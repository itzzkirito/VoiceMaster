import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';
import { getRoom, updateRoom } from '../../models/Room';

export default class VcUnlockCommand extends Command {
  constructor() {
    super({
      name: 'vcunlock',
      description: 'Unlock your voice channel',
      category: 'voice',
      aliases: ['vunlock'],
      cooldown: 3,
      permissions: [PermissionFlagsBits.ManageChannels],
      guildOnly: true,
      supportsMessageCommands: true,
      noPrefix: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('vcunlock')
      .setDescription('Unlock your voice channel');
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
      // Check if this is a private room
      const room = await getRoom(currentVC.id);
      if (!room) {
        await interaction.reply({
          embeds: [embeds.error('Error', 'This is not a private room.')],
          ephemeral: true,
        });
        return;
      }

      // Check if user is the room owner
      if (room.ownerId !== interaction.member.user.id) {
        await interaction.reply({
          embeds: [embeds.error('Error', 'You are not the owner of this room.')],
          ephemeral: true,
        });
        return;
      }

      // Update channel permissions
      await currentVC.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        Connect: true,
      });

      // Update database to mark room as unlocked
      await updateRoom(currentVC.id, { locked: false });

      await interaction.reply({
        embeds: [
          embeds.success(
            'Channel Unlocked',
            `🔓 ${currentVC} is now unlocked`
          ),
        ],
      });
    } catch (error) {
      console.error('VcUnlock error:', error);
      await interaction.reply({
        embeds: [embeds.error('Error', 'Failed to unlock channel. Please check my permissions.')],
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
      // Check if this is a private room
      const room = await getRoom(currentVC.id);
      if (!room) {
        await message.reply({
          embeds: [embeds.error('Error', 'This is not a private room.')],
        });
        return;
      }

      // Check if user is the room owner
      if (room.ownerId !== message.author.id) {
        await message.reply({
          embeds: [embeds.error('Error', 'You are not the owner of this room.')],
        });
        return;
      }

      // Update channel permissions
      await currentVC.permissionOverwrites.edit(message.guild.roles.everyone, {
        Connect: true,
      });

      // Update database to mark room as unlocked
      await updateRoom(currentVC.id, { locked: false });

      await message.reply({
        embeds: [
          embeds.success(
            'Channel Unlocked',
            `🔓 ${currentVC} is now unlocked`
          ),
        ],
      });
    } catch (error) {
      console.error('VcUnlock error:', error);
      await message.reply({
        embeds: [embeds.error('Error', 'Failed to unlock channel. Please check my permissions.')],
      });
    }
  }
}

