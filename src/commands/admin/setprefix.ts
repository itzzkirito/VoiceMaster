import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';
import { Guild } from '../../models';
import mongoose from 'mongoose';
import { BotClient } from '../../client';

export default class SetPrefixCommand extends Command {
  constructor() {
    super({
      name: 'setprefix',
      description: 'Set the command prefix for this server',
      category: 'admin',
      permissions: [PermissionFlagsBits.ManageGuild],
      guildOnly: true,
      supportsMessageCommands: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('setprefix')
      .setDescription('Set the command prefix for this server')
      .addStringOption(option =>
        option
          .setName('prefix')
          .setDescription('The new prefix to use (1-5 characters, no spaces)')
          .setRequired(true)
          .setMaxLength(5)
          .setMinLength(1)
      );
  }

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'This command can only be used in a server.')],
        ephemeral: true,
      });
      return;
    }

    const newPrefix = interaction.options.getString('prefix', true).trim();

    // Validate prefix
    if (newPrefix.length === 0 || newPrefix.length > 5) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'Prefix must be between 1 and 5 characters.')],
        ephemeral: true,
      });
      return;
    }

    if (/\s/.test(newPrefix)) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'Prefix cannot contain spaces.')],
        ephemeral: true,
      });
      return;
    }

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'Database is not connected. Please try again later.')],
        ephemeral: true,
      });
      return;
    }

    try {
      // Find or create guild document
      let guildData = await Guild.findOne({ discordId: interaction.guild.id });

      if (!guildData) {
        // Create new guild document if it doesn't exist
        guildData = await Guild.create({
          discordId: interaction.guild.id,
          name: interaction.guild.name,
          prefix: newPrefix,
        });
      } else {
        // Update existing guild document
        guildData.prefix = newPrefix;
        await guildData.save();
      }

      // Update cache
      const client = interaction.client as BotClient;
      client.guildPrefixes.set(interaction.guild.id, newPrefix);

      await interaction.reply({
        embeds: [embeds.success('Prefix Updated', `The command prefix has been set to \`${newPrefix}\`\n\nUse \`${newPrefix}help\` to see available commands.`)],
      });
    } catch (error) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'Failed to update the prefix. Please try again later.')],
        ephemeral: true,
      });
    }
  }

  override async messageExecute({ message, args }: MessageCommandArgs) {
    if (!message.guild || !message.member) {
      await message.reply({
        embeds: [embeds.error('Error', 'This command can only be used in a server.')],
      });
      return;
    }

    if (!args || args.length === 0) {
      await message.reply({
        embeds: [embeds.error('Error', 'Please provide a prefix.\n**Usage:** `setprefix <prefix>`')],
      });
      return;
    }

    const prefixArg = args[0];
    if (!prefixArg) {
      await message.reply({
        embeds: [embeds.error('Error', 'Please provide a prefix.\n**Usage:** `setprefix <prefix>`')],
      });
      return;
    }

    const newPrefix = prefixArg.trim();

    // Validate prefix
    if (newPrefix.length === 0 || newPrefix.length > 5) {
      await message.reply({
        embeds: [embeds.error('Error', 'Prefix must be between 1 and 5 characters.')],
      });
      return;
    }

    if (/\s/.test(newPrefix)) {
      await message.reply({
        embeds: [embeds.error('Error', 'Prefix cannot contain spaces.')],
      });
      return;
    }

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      await message.reply({
        embeds: [embeds.error('Error', 'Database is not connected. Please try again later.')],
      });
      return;
    }

    try {
      // Find or create guild document
      let guildData = await Guild.findOne({ discordId: message.guild.id });

      if (!guildData) {
        // Create new guild document if it doesn't exist
        guildData = await Guild.create({
          discordId: message.guild.id,
          name: message.guild.name,
          prefix: newPrefix,
        });
      } else {
        // Update existing guild document
        guildData.prefix = newPrefix;
        await guildData.save();
      }

      // Update cache
      const client = message.client as BotClient;
      client.guildPrefixes.set(message.guild.id, newPrefix);

      await message.reply({
        embeds: [embeds.success('Prefix Updated', `The command prefix has been set to \`${newPrefix}\`\n\nUse \`${newPrefix}help\` to see available commands.`)],
      });
    } catch (error) {
      await message.reply({
        embeds: [embeds.error('Error', 'Failed to update the prefix. Please try again later.')],
      });
    }
  }
}

