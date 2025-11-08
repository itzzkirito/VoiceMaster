import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';

export default class VcKickAllCommand extends Command {
  constructor() {
    super({
      name: 'vckickall',
      description: 'Kick all users from your voice channel',
      category: 'voice',
      aliases: ['vkickall'],
      cooldown: 5,
      permissions: [PermissionFlagsBits.MoveMembers],
      guildOnly: true,
      supportsMessageCommands: true,
      noPrefix: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('vckickall')
      .setDescription('Kick all users from your voice channel');
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

    const members = currentVC.members.filter((m) => m.id !== member.id);

    if (members.size === 0) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'There are no other users in the voice channel.')],
        ephemeral: true,
      });
      return;
    }

    try {
      const promises = members.map((m) =>
        m.voice.disconnect(`Kicked all by ${interaction.user.tag}`).catch(() => {})
      );
      await Promise.all(promises);

      await interaction.reply({
        embeds: [
          embeds.success(
            'Users Kicked',
            `👢 Kicked ${members.size} user(s) from ${currentVC}`
          ),
        ],
      });
    } catch (error) {
      console.error('VcKickAll error:', error);
      await interaction.reply({
        embeds: [embeds.error('Error', 'Failed to kick users. Please check my permissions.')],
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

    const members = currentVC.members.filter((m) => m.id !== member.id);

    if (members.size === 0) {
      await message.reply({
        embeds: [embeds.error('Error', 'There are no other users in the voice channel.')],
      });
      return;
    }

    try {
      const promises = members.map((m) =>
        m.voice.disconnect(`Kicked all by ${message.author.tag}`).catch(() => {})
      );
      await Promise.all(promises);

      await message.reply({
        embeds: [
          embeds.success(
            'Users Kicked',
            `👢 Kicked ${members.size} user(s) from ${currentVC}`
          ),
        ],
      });
    } catch (error) {
      console.error('VcKickAll error:', error);
      await message.reply({
        embeds: [embeds.error('Error', 'Failed to kick users. Please check my permissions.')],
      });
    }
  }
}

