import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Message,
  User,
  EmbedBuilder,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';
import { User as UserModel } from '../../models';
import { logger } from '../../utils/logger';
import { BotClient } from '../../client';

/**
 * NoPrefix Command
 * Manage no-prefix users - allows users to use commands without prefix
 */
export default class NoPrefixCommand extends Command {
  constructor() {
    super({
      name: 'noprefix',
      description: 'Manage no-prefix users - allows users to use commands without prefix (Owner only)',
      category: 'owner',
      ownerOnly: true,
      noPrefix: true,
      supportsMessageCommands: true,
      aliases: ['np'],
      cooldown: 3,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('noprefix')
      .setDescription('Manage no-prefix users - allows users to use commands without prefix')
      .addStringOption((option) =>
        option
          .setName('action')
          .setDescription('Action to perform')
          .setRequired(true)
          .addChoices(
            { name: 'Add User', value: 'add' },
            { name: 'Remove User', value: 'remove' },
            { name: 'List Users', value: 'list' },
            { name: 'Check User', value: 'check' }
          )
      )
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('User to add/remove/check (not needed for list)')
          .setRequired(false)
      );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const action = interaction.options.getString('action', true);
    const user = interaction.options.getUser('user');

    await this.handleNoPrefixAction(interaction, action, user || undefined);
  }

  override async messageExecute({ message, args }: MessageCommandArgs): Promise<void> {
    if (!args || args.length === 0) {
      await this.showHelp(message);
      return;
    }

    const firstArg = args[0];
    if (!firstArg) {
      await this.showHelp(message);
      return;
    }

    const action = firstArg.toLowerCase();
    let user: User | undefined;

    if (action !== 'list' && args.length > 1) {
      const userMention = args[1];
      if (!userMention) {
        await message.reply({
          embeds: [embeds.error('Error', 'Invalid user mention or user not found.')],
        });
        return;
      }
      const userId = userMention.replace(/[<@!>]/g, '');
      try {
        user = await message.client.users.fetch(userId);
      } catch (error) {
        await message.reply({
          embeds: [embeds.error('Error', 'Invalid user mention or user not found.')],
        });
        return;
      }
    }

    await this.handleNoPrefixAction(message, action, user);
  }

  private async handleNoPrefixAction(
    interaction: ChatInputCommandInteraction | Message,
    action: string,
    user?: User
  ): Promise<void> {
    try {
      switch (action.toLowerCase()) {
        case 'add':
          if (!user) {
            await this.sendError(interaction, 'Please specify a user to add to no-prefix.');
            return;
          }
          await this.addNoPrefixUser(interaction, user);
          break;

        case 'remove':
          if (!user) {
            await this.sendError(interaction, 'Please specify a user to remove from no-prefix.');
            return;
          }
          await this.removeNoPrefixUser(interaction, user);
          break;

        case 'list':
          await this.listNoPrefixUsers(interaction);
          break;

        case 'check':
          if (!user) {
            await this.sendError(interaction, 'Please specify a user to check.');
            return;
          }
          await this.checkNoPrefixUser(interaction, user);
          break;

        default:
          await this.sendError(
            interaction,
            'Invalid action. Use: `add`, `remove`, `list`, or `check`'
          );
      }
    } catch (error) {
      logger.error({ err: error }, '[NOPREFIX] Error handling action');
      await this.sendError(interaction, 'An error occurred while processing your request.');
    }
  }

  private async addNoPrefixUser(
    interaction: ChatInputCommandInteraction | Message,
    user: User
  ): Promise<void> {
    try {
      // Check if user already has no-prefix
      let userData = await UserModel.findOne({ discordId: user.id });

      if (userData && userData.noPrefix) {
        await this.sendError(interaction, `**${user.username}** already has no-prefix access.`);
        return;
      }

      const ownerId =
        interaction instanceof ChatInputCommandInteraction
          ? interaction.user.id
          : interaction.author.id;

      // Add or update user with no-prefix
      if (userData) {
        userData.noPrefix = true;
        userData.noPrefixAddedBy = ownerId;
        userData.noPrefixAddedAt = new Date();
        await userData.save();
      } else {
        userData = await UserModel.create({
          discordId: user.id,
          username: user.username,
          discriminator: user.discriminator,
          avatar: user.avatar,
          bot: user.bot,
          noPrefix: true,
          noPrefixAddedBy: ownerId,
          noPrefixAddedAt: new Date(),
        });
      }

      // Update bot's internal cache
      const client = interaction.client as BotClient;
      const trimmedId = user.id.trim();
      client.noPrefixUsers.add(trimmedId);
      logger.debug(`[NOPREFIX] Added user ID to Set: ${trimmedId}`);

      const embed = new EmbedBuilder()
        .setTitle('✅ No-Prefix User Added')
        .setDescription(`**${user.username}** (${user.id}) can now use commands without prefix.`)
        .setColor('#00FF00')
        .addFields(
          {
            name: 'User',
            value: `${user.username} (${user.id})`,
            inline: true,
          },
          {
            name: 'Added By',
            value: `<@${ownerId}>`,
            inline: true,
          },
          {
            name: 'Added At',
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: true,
          }
        )
        .setFooter({ text: 'Advanced No-Prefix System' })
        .setTimestamp();

      await this.sendResponse(interaction, { embeds: [embed] });
      logger.info(`[NOPREFIX] Added no-prefix access for user ${user.id} by ${ownerId}`);
    } catch (error) {
      logger.error({ err: error }, '[NOPREFIX] Error adding no-prefix user');
      await this.sendError(interaction, 'Failed to add no-prefix user.');
    }
  }

  private async removeNoPrefixUser(
    interaction: ChatInputCommandInteraction | Message,
    user: User
  ): Promise<void> {
    try {
      const userData = await UserModel.findOne({ discordId: user.id });

      if (!userData || !userData.noPrefix) {
        await this.sendError(interaction, `**${user.username}** doesn't have no-prefix access.`);
        return;
      }

      // Remove no-prefix access
      userData.noPrefix = false;
      delete userData.noPrefixAddedBy;
      delete userData.noPrefixAddedAt;
      await userData.save();

      // Update bot's internal cache
      const client = interaction.client as BotClient;
      const trimmedId = user.id.trim();
      client.noPrefixUsers.delete(trimmedId);
      logger.debug(`[NOPREFIX] Removed user ID from Set: ${trimmedId}`);

      const embed = new EmbedBuilder()
        .setTitle('❌ No-Prefix User Removed')
        .setDescription(`**${user.username}** (${user.id}) no longer has no-prefix access.`)
        .setColor('#FF0000')
        .addFields(
          {
            name: 'User',
            value: `${user.username} (${user.id})`,
            inline: true,
          },
          {
            name: 'Removed By',
            value: `<@${
              interaction instanceof ChatInputCommandInteraction
                ? interaction.user.id
                : interaction.author.id
            }>`,
            inline: true,
          },
          {
            name: 'Removed At',
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: true,
          }
        )
        .setFooter({ text: 'Advanced No-Prefix System' })
        .setTimestamp();

      await this.sendResponse(interaction, { embeds: [embed] });
      logger.info(`[NOPREFIX] Removed no-prefix access for user ${user.id}`);
    } catch (error) {
      logger.error({ err: error }, '[NOPREFIX] Error removing no-prefix user');
      await this.sendError(interaction, 'Failed to remove no-prefix user.');
    }
  }

  private async listNoPrefixUsers(
    interaction: ChatInputCommandInteraction | Message
  ): Promise<void> {
    try {
      const noPrefixUsers = await UserModel.find({ noPrefix: true })
        .select('discordId noPrefixAddedBy noPrefixAddedAt')
        .limit(50);

      if (noPrefixUsers.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📋 No-Prefix Users')
          .setDescription('No users currently have no-prefix access.')
          .setColor('#7289DA')
          .setFooter({ text: 'Advanced No-Prefix System' });

        await this.sendResponse(interaction, { embeds: [embed] });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📋 No-Prefix Users')
        .setDescription(`**${noPrefixUsers.length}** users have no-prefix access.`)
        .setColor('#7289DA')
        .setFooter({ text: 'Advanced No-Prefix System' })
        .setTimestamp();

      // Add users in chunks to avoid embed limits
      const chunks = this.chunkArray(noPrefixUsers, 10);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!chunk) continue;

        const fieldName = i === 0 ? 'Users' : `Users (${i + 1})`;

        const userList = chunk
          .map((user) => {
            const addedAt = user.noPrefixAddedAt
              ? `<t:${Math.floor(new Date(user.noPrefixAddedAt).getTime() / 1000)}:R>`
              : 'Unknown';
            return `• <@${user.discordId}> (Added ${addedAt})`;
          })
          .join('\n');

        embed.addFields({
          name: fieldName,
          value: userList,
          inline: false,
        });
      }

      await this.sendResponse(interaction, { embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, '[NOPREFIX] Error listing no-prefix users');
      await this.sendError(interaction, 'Failed to list no-prefix users.');
    }
  }

  private async checkNoPrefixUser(
    interaction: ChatInputCommandInteraction | Message,
    user: User
  ): Promise<void> {
    try {
      const userData = await UserModel.findOne({ discordId: user.id })
        .select('noPrefix noPrefixAddedBy noPrefixAddedAt')
        .lean();

      const hasNoPrefix = userData?.noPrefix || false;

      const embed = new EmbedBuilder()
        .setTitle('🔍 No-Prefix User Check')
        .setDescription(`Checking no-prefix status for **${user.username}**`)
        .setColor(hasNoPrefix ? '#00FF00' : '#FF0000')
        .addFields(
          {
            name: 'User',
            value: `${user.username} (${user.id})`,
            inline: true,
          },
          {
            name: 'No-Prefix Access',
            value: hasNoPrefix ? '✅ **Yes**' : '❌ **No**',
            inline: true,
          }
        )
        .setFooter({ text: 'Advanced No-Prefix System' })
        .setTimestamp();

      if (hasNoPrefix && userData?.noPrefixAddedBy && userData?.noPrefixAddedAt) {
        embed.addFields(
          {
            name: 'Added By',
            value: `<@${userData.noPrefixAddedBy}>`,
            inline: true,
          },
          {
            name: 'Added At',
            value: `<t:${Math.floor(new Date(userData.noPrefixAddedAt).getTime() / 1000)}:F>`,
            inline: true,
          }
        );
      }

      await this.sendResponse(interaction, { embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, '[NOPREFIX] Error checking no-prefix user');
      await this.sendError(interaction, 'Failed to check no-prefix user.');
    }
  }

  // Helper methods
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

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async showHelp(message: Message): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('🔧 No-Prefix Management')
      .setDescription('Manage users who can use commands without prefix.')
      .setColor('#7289DA')
      .addFields(
        {
          name: 'Usage',
          value: '`.noprefix <action> [user]`',
          inline: true,
        },
        {
          name: 'Actions',
          value:
            '`add` - Add user to no-prefix\n`remove` - Remove user from no-prefix\n`list` - List all no-prefix users\n`check` - Check user\'s no-prefix status',
          inline: true,
        },
        {
          name: 'Examples',
          value:
            '`.noprefix add @user`\n`.noprefix remove @user`\n`.noprefix list`\n`.noprefix check @user`',
          inline: false,
        }
      )
      .setFooter({ text: 'Owner Only Command' });

    await message.reply({ embeds: [embed] });
  }
}

