import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Message,
  EmbedBuilder,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';
import { User as UserModel, Guild as GuildModel } from '../../models';
import { logger } from '../../utils/logger';

/**
 * Blacklist Command
 * Add or remove a guild or user from blacklist
 */
export default class BlacklistCommand extends Command {
  constructor() {
    super({
      name: 'blacklist',
      description: 'Add or remove a guild or user from blacklist (Owner only)',
      category: 'owner',
      ownerOnly: true,
      noPrefix: true,
      supportsMessageCommands: true,
      aliases: ['bl'],
      cooldown: 5,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('blacklist')
      .setDescription('Add or remove a guild or user from blacklist')
      .addStringOption((option) =>
        option
          .setName('type')
          .setDescription('Type of blacklist (guild or user)')
          .setRequired(true)
          .addChoices(
            { name: 'Guild', value: 'guild' },
            { name: 'User', value: 'user' }
          )
      )
      .addStringOption((option) =>
        option
          .setName('id')
          .setDescription('Guild ID or User ID to blacklist/unblacklist')
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('action')
          .setDescription('Action to perform')
          .setRequired(false)
          .addChoices(
            { name: 'Add', value: 'add' },
            { name: 'Remove', value: 'remove' },
            { name: 'Check', value: 'check' }
          )
      )
      .addStringOption((option) =>
        option
          .setName('reason')
          .setDescription('Reason for blacklisting')
          .setRequired(false)
      );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const type = interaction.options.getString('type', true);
    const id = interaction.options.getString('id', true);
    const action = interaction.options.getString('action') || 'add';
    const reason = interaction.options.getString('reason') || undefined;

    await this.handleBlacklistAction(interaction, type, id, action, reason);
  }

  override async messageExecute({ message, args }: MessageCommandArgs): Promise<void> {
    if (!args || args.length < 2) {
      await message.reply({
        embeds: [
          embeds.error(
            'Error',
            'Please provide type and id.\nUsage: `.blacklist <guild|user> <id> [add|remove|check] [reason]`'
          ),
        ],
      });
      return;
    }

    const type = args[0]?.toLowerCase();
    const id = args[1];
    const action = args[2]?.toLowerCase() || 'add';
    const reason = args.slice(3).join(' ') || undefined;

    if (type !== 'guild' && type !== 'user') {
      await message.reply({
        embeds: [embeds.error('Error', 'Type must be either `guild` or `user`.')],
      });
      return;
    }

    if (!id) {
      await message.reply({
        embeds: [embeds.error('Error', 'Please provide an ID.')],
      });
      return;
    }

    await this.handleBlacklistAction(message, type, id, action, reason);
  }

  private async handleBlacklistAction(
    interaction: ChatInputCommandInteraction | Message,
    type: string,
    id: string,
    action: string,
    reason?: string
  ): Promise<void> {
    try {
      const ownerId =
        interaction instanceof ChatInputCommandInteraction
          ? interaction.user.id
          : interaction.author.id;

      if (type === 'guild') {
        await this.handleGuildBlacklist(interaction, id, action, ownerId, reason);
      } else if (type === 'user') {
        await this.handleUserBlacklist(interaction, id, action, ownerId, reason);
      } else {
        await this.sendError(interaction, 'Invalid type. Use `guild` or `user`.');
      }
    } catch (error) {
      logger.error({ err: error }, '[BLACKLIST] Error handling blacklist action');
      await this.sendError(interaction, 'An error occurred while processing your request.');
    }
  }

  private async handleGuildBlacklist(
    interaction: ChatInputCommandInteraction | Message,
    guildId: string,
    action: string,
    ownerId: string,
    reason?: string
  ): Promise<void> {
    try {
      // Validate guild exists
      const guild = await interaction.client.guilds.fetch(guildId).catch(() => null);
      if (!guild && action !== 'check') {
        await this.sendError(interaction, `Guild with ID \`${guildId}\` not found or bot is not in that guild.`);
        return;
      }

      let guildData = await GuildModel.findOne({ discordId: guildId });

      if (action === 'add') {
        if (!guildData) {
          guildData = await GuildModel.create({
            discordId: guildId,
            name: guild?.name || 'Unknown',
            isBlacklisted: false,
          });
        }

        if (guildData.isBlacklisted) {
          await this.sendError(interaction, `⚠️ Guild \`${guild?.name || guildId}\` is already blacklisted.`);
          return;
        }

        guildData.isBlacklisted = true;
        guildData.blacklistedBy = ownerId;
        guildData.blacklistedAt = new Date();
        if (reason !== undefined) {
          guildData.blacklistReason = reason;
        }
        await guildData.save();

        // Leave the guild if bot is in it
        if (guild) {
          try {
            await guild.leave();
            logger.info(`[BLACKLIST] Left blacklisted guild: ${guild.name} (${guildId})`);
          } catch (error) {
            logger.error({ err: error }, `[BLACKLIST] Failed to leave guild ${guildId}`);
          }
        }

        const embed = new EmbedBuilder()
          .setTitle('✅ Guild Blacklisted')
          .setDescription(`Guild \`${guild?.name || guildId}\` has been blacklisted.`)
          .setColor('#FF0000')
          .addFields(
            { name: 'Guild ID', value: guildId, inline: true },
            { name: 'Blacklisted By', value: `<@${ownerId}>`, inline: true },
            { name: 'Reason', value: reason || 'No reason provided', inline: false }
          )
          .setTimestamp();

        await this.sendResponse(interaction, { embeds: [embed] });
        logger.info(`[BLACKLIST] Guild ${guildId} blacklisted by ${ownerId}`);
      } else if (action === 'remove') {
        if (!guildData || !guildData.isBlacklisted) {
          await this.sendError(interaction, `⚠️ Guild \`${guildId}\` is not blacklisted.`);
          return;
        }

        guildData.isBlacklisted = false;
        delete guildData.blacklistedBy;
        delete guildData.blacklistedAt;
        delete guildData.blacklistReason;
        await guildData.save();

        const embed = new EmbedBuilder()
          .setTitle('✅ Guild Unblacklisted')
          .setDescription(`Guild \`${guild?.name || guildId}\` has been removed from blacklist.`)
          .setColor('#00FF00')
          .addFields(
            { name: 'Guild ID', value: guildId, inline: true },
            { name: 'Unblacklisted By', value: `<@${ownerId}>`, inline: true }
          )
          .setTimestamp();

        await this.sendResponse(interaction, { embeds: [embed] });
        logger.info(`[BLACKLIST] Guild ${guildId} unblacklisted by ${ownerId}`);
      } else if (action === 'check') {
        if (!guildData) {
          guildData = await GuildModel.create({
            discordId: guildId,
            name: guild?.name || 'Unknown',
            isBlacklisted: false,
          });
        }
        const isBlacklisted = guildData.isBlacklisted || false;

        const embed = new EmbedBuilder()
          .setTitle('🔍 Guild Blacklist Check')
          .setDescription(`Checking blacklist status for guild \`${guildId}\``)
          .setColor(isBlacklisted ? '#FF0000' : '#00FF00')
          .addFields(
            { name: 'Guild ID', value: guildId, inline: true },
            { name: 'Status', value: isBlacklisted ? '🔴 Blacklisted' : '✅ Not Blacklisted', inline: true }
          )
          .setTimestamp();

        if (isBlacklisted && guildData?.blacklistedAt) {
          embed.addFields(
            { name: 'Blacklisted At', value: `<t:${Math.floor(new Date(guildData.blacklistedAt).getTime() / 1000)}:F>`, inline: true },
            { name: 'Blacklisted By', value: guildData.blacklistedBy ? `<@${guildData.blacklistedBy}>` : 'Unknown', inline: true },
            { name: 'Reason', value: guildData.blacklistReason || 'No reason provided', inline: false }
          );
        }

        await this.sendResponse(interaction, { embeds: [embed] });
      }
    } catch (error) {
      logger.error({ err: error }, '[BLACKLIST] Error handling guild blacklist');
      await this.sendError(interaction, 'Failed to process guild blacklist action.');
    }
  }

  private async handleUserBlacklist(
    interaction: ChatInputCommandInteraction | Message,
    userId: string,
    action: string,
    ownerId: string,
    reason?: string
  ): Promise<void> {
    try {
      // Validate user exists
      const user = await interaction.client.users.fetch(userId).catch(() => null);
      if (!user && action !== 'check') {
        await this.sendError(interaction, `User with ID \`${userId}\` not found.`);
        return;
      }

      let userData = await UserModel.findOne({ discordId: userId });

      if (action === 'add') {
        if (!userData) {
          userData = await UserModel.create({
            discordId: userId,
            username: user?.username || 'Unknown',
            isBlacklisted: false,
          });
        }

        if (userData.isBlacklisted) {
          await this.sendError(interaction, `⚠️ User \`${user?.username || userId}\` is already blacklisted.`);
          return;
        }

        userData.isBlacklisted = true;
        userData.blacklistedBy = ownerId;
        userData.blacklistedAt = new Date();
        if (reason !== undefined) {
          userData.blacklistReason = reason;
        }
        await userData.save();

        const embed = new EmbedBuilder()
          .setTitle('✅ User Blacklisted')
          .setDescription(`User \`${user?.username || userId}\` has been blacklisted.`)
          .setColor('#FF0000')
          .addFields(
            { name: 'User', value: `${user?.username || 'Unknown'} (${userId})`, inline: true },
            { name: 'Blacklisted By', value: `<@${ownerId}>`, inline: true },
            { name: 'Reason', value: reason || 'No reason provided', inline: false }
          )
          .setTimestamp();

        await this.sendResponse(interaction, { embeds: [embed] });
        logger.info(`[BLACKLIST] User ${userId} blacklisted by ${ownerId}`);
      } else if (action === 'remove') {
        if (!userData || !userData.isBlacklisted) {
          await this.sendError(interaction, `⚠️ User \`${userId}\` is not blacklisted.`);
          return;
        }

        userData.isBlacklisted = false;
        delete userData.blacklistedBy;
        delete userData.blacklistedAt;
        delete userData.blacklistReason;
        await userData.save();

        const embed = new EmbedBuilder()
          .setTitle('✅ User Unblacklisted')
          .setDescription(`User \`${user?.username || userId}\` has been removed from blacklist.`)
          .setColor('#00FF00')
          .addFields(
            { name: 'User', value: `${user?.username || 'Unknown'} (${userId})`, inline: true },
            { name: 'Unblacklisted By', value: `<@${ownerId}>`, inline: true }
          )
          .setTimestamp();

        await this.sendResponse(interaction, { embeds: [embed] });
        logger.info(`[BLACKLIST] User ${userId} unblacklisted by ${ownerId}`);
      } else if (action === 'check') {
        if (!userData) {
          userData = await UserModel.create({
            discordId: userId,
            username: user?.username || 'Unknown',
            isBlacklisted: false,
          });
        }
        const isBlacklisted = userData.isBlacklisted || false;

        const embed = new EmbedBuilder()
          .setTitle('🔍 User Blacklist Check')
          .setDescription(`Checking blacklist status for user \`${userId}\``)
          .setColor(isBlacklisted ? '#FF0000' : '#00FF00')
          .addFields(
            { name: 'User', value: `${user?.username || 'Unknown'} (${userId})`, inline: true },
            { name: 'Status', value: isBlacklisted ? '🔴 Blacklisted' : '✅ Not Blacklisted', inline: true }
          )
          .setTimestamp();

        if (isBlacklisted && userData?.blacklistedAt) {
          embed.addFields(
            { name: 'Blacklisted At', value: `<t:${Math.floor(new Date(userData.blacklistedAt).getTime() / 1000)}:F>`, inline: true },
            { name: 'Blacklisted By', value: userData.blacklistedBy ? `<@${userData.blacklistedBy}>` : 'Unknown', inline: true },
            { name: 'Reason', value: userData.blacklistReason || 'No reason provided', inline: false }
          );
        }

        await this.sendResponse(interaction, { embeds: [embed] });
      }
    } catch (error) {
      logger.error({ err: error }, '[BLACKLIST] Error handling user blacklist');
      await this.sendError(interaction, 'Failed to process user blacklist action.');
    }
  }

  private async sendResponse(
    interaction: ChatInputCommandInteraction | Message,
    options: { embeds?: EmbedBuilder[]; content?: string }
  ): Promise<void> {
    if (interaction instanceof ChatInputCommandInteraction) {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(options);
      } else {
        await interaction.reply(options);
      }
    } else {
      await interaction.reply(options);
    }
  }

  private async sendError(
    interaction: ChatInputCommandInteraction | Message,
    message: string
  ): Promise<void> {
    if (interaction instanceof ChatInputCommandInteraction) {
      await interaction.reply({
        embeds: [embeds.error('Error', message)],
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        embeds: [embeds.error('Error', message)],
      });
    }
  }
}

