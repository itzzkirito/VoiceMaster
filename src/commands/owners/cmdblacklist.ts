import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';
import { CommandBlacklist } from '../../models';
import { logger } from '../../utils/logger';
import { BotClient } from '../../client';
import { commands } from '../../commands';

/**
 * Command Blacklist Command
 * Manage global command blacklist
 */
export default class CmdBlacklistCommand extends Command {
  constructor() {
    super({
      name: 'cmdblacklist',
      description: 'Manage global command blacklist (Owner only)',
      category: 'owner',
      ownerOnly: true,
      noPrefix: true,
      supportsMessageCommands: true,
      aliases: ['cmdb', 'cmdbl', 'blacklistcmd'],
      cooldown: 3,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('cmdblacklist')
      .setDescription('Manage global command blacklist')
      .addStringOption((option) =>
        option
          .setName('action')
          .setDescription('Action to perform')
          .setRequired(true)
          .addChoices(
            { name: 'Add Command', value: 'add' },
            { name: 'Remove Command', value: 'remove' },
            { name: 'List Blacklisted', value: 'list' },
            { name: 'Check Command', value: 'check' }
          )
      )
      .addStringOption((option) =>
        option
          .setName('command')
          .setDescription('Command name to add/remove/check')
          .setRequired(false)
      );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      const action = interaction.options.getString('action', true);
      const commandName = interaction.options.getString('command') || '';

      const embed = await this.handleAction(
        action,
        commandName,
        interaction.user.tag,
        interaction.user.displayAvatarURL(),
        interaction.client as BotClient
      );
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, '[CMDBLACKLIST] Error');
      await interaction.editReply({
        embeds: [
          embeds.error(
            'Error',
            `An error occurred: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
      });
    }
  }

  override async messageExecute({ message, args }: MessageCommandArgs): Promise<void> {
    if (!args || args.length === 0) {
      await message.reply({
        embeds: [
          embeds.error(
            'Error',
            'Usage: `.cmdblacklist <add|remove|list|check> [command]`'
          ),
        ],
      });
      return;
    }

    try {
      const actionArg = args[0];
      if (!actionArg) {
        await message.reply({
          embeds: [
            embeds.error(
              'Error',
              'Usage: `.cmdblacklist <add|remove|list|check> [command]`'
            ),
          ],
        });
        return;
      }

      const action = actionArg.toLowerCase();
      const commandName = args.slice(1).join(' ');

      const embed = await this.handleAction(
        action,
        commandName,
        message.author.tag,
        message.author.displayAvatarURL(),
        message.client as BotClient
      );
      await message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, '[CMDBLACKLIST] Error');
      await message.reply({
        embeds: [
          embeds.error(
            'Error',
            `An error occurred: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
      });
    }
  }

  private async handleAction(
    action: string,
    commandName: string,
    requestedBy: string,
    avatarURL: string,
    client: BotClient
  ): Promise<EmbedBuilder> {
    switch (action.toLowerCase()) {
      case 'add':
        return await this.addCommand(commandName, requestedBy, avatarURL, client);
      case 'remove':
        return await this.removeCommand(commandName, requestedBy, avatarURL, client);
      case 'list':
        return await this.listCommands(requestedBy, avatarURL);
      case 'check':
        return await this.checkCommand(commandName, requestedBy, avatarURL, client);
      default:
        return embeds.error('Error', 'Invalid action. Use: `add`, `remove`, `list`, or `check`');
    }
  }

  private async addCommand(
    commandName: string,
    requestedBy: string,
    avatarURL: string,
    client: BotClient
  ): Promise<EmbedBuilder> {
    if (!commandName) {
      return embeds.error('Error', 'Please provide a command name to blacklist.');
    }

    const normalizedName = commandName.toLowerCase().trim();

    // Check if command exists
    const commandExists =
      commands.has(normalizedName) ||
      commands.find((cmd) => cmd.name === normalizedName || cmd.aliases.includes(normalizedName));

    if (!commandExists) {
      return embeds.warning(
        'Warning',
        `Command \`${commandName}\` not found. It will still be added to the blacklist.`
      );
    }

    // Check if already blacklisted
    const existing = await CommandBlacklist.findOne({ commandName: normalizedName });
    if (existing) {
      return embeds.warning('Warning', `Command \`${commandName}\` is already blacklisted.`);
    }

    // Add to database
    await CommandBlacklist.create({
      commandName: normalizedName,
      addedBy: requestedBy,
    });

    // Update bot's internal cache
    client.commandBlacklist.add(normalizedName);
    await this.loadBlacklist(client);

    logger.info(`[CMDBLACKLIST] ${requestedBy} blacklisted command: ${commandName}`);

    const embed = new EmbedBuilder()
      .setTitle('✅ Command Blacklisted')
      .setDescription(`Successfully added \`${commandName}\` to the blacklist.`)
      .setColor('#43B581')
      .setTimestamp()
      .setFooter({
        text: `Blacklisted by ${requestedBy}`,
        iconURL: avatarURL,
      });

    return embed;
  }

  private async removeCommand(
    commandName: string,
    requestedBy: string,
    avatarURL: string,
    client: BotClient
  ): Promise<EmbedBuilder> {
    if (!commandName) {
      return embeds.error('Error', 'Please provide a command name to remove from blacklist.');
    }

    const normalizedName = commandName.toLowerCase().trim();

    const existing = await CommandBlacklist.findOne({ commandName: normalizedName });
    if (!existing) {
      return embeds.warning('Warning', `Command \`${commandName}\` is not in the blacklist.`);
    }

    // Remove from database
    await CommandBlacklist.deleteOne({ commandName: normalizedName });

    // Update bot's internal cache
    client.commandBlacklist.delete(normalizedName);

    logger.info(`[CMDBLACKLIST] ${requestedBy} removed command from blacklist: ${commandName}`);

    const embed = new EmbedBuilder()
      .setTitle('✅ Command Removed')
      .setDescription(`Successfully removed \`${commandName}\` from the blacklist.`)
      .setColor('#43B581')
      .setTimestamp()
      .setFooter({
        text: `Removed by ${requestedBy}`,
        iconURL: avatarURL,
      });

    return embed;
  }

  private async listCommands(requestedBy: string, avatarURL: string): Promise<EmbedBuilder> {
    const blacklistedCommands = await CommandBlacklist.find()
      .select('commandName addedAt')
      .sort({ commandName: 1 })
      .limit(100);

    if (blacklistedCommands.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('📋 Command Blacklist')
        .setDescription('No commands are currently blacklisted.')
        .setColor('#7289DA')
        .setTimestamp()
        .setFooter({
          text: `Requested by ${requestedBy}`,
          iconURL: avatarURL,
        });

      return embed;
    }

    const commandList = blacklistedCommands.map((cmd) => `\`${cmd.commandName}\``).join(', ');

    const embed = new EmbedBuilder()
      .setTitle('📋 Command Blacklist')
      .setDescription(`**Total:** ${blacklistedCommands.length} command(s)\n\n${commandList}`)
      .setColor('#7289DA')
      .setTimestamp()
      .setFooter({
        text: `Requested by ${requestedBy}`,
        iconURL: avatarURL,
      });

    return embed;
  }

  private async checkCommand(
    commandName: string,
    requestedBy: string,
    avatarURL: string,
    client: BotClient
  ): Promise<EmbedBuilder> {
    if (!commandName) {
      return embeds.error('Error', 'Please provide a command name to check.');
    }

    const normalizedName = commandName.toLowerCase().trim();
    const isBlacklisted = client.commandBlacklist.has(normalizedName);
    const commandExists =
      commands.has(normalizedName) ||
      commands.find((cmd) => cmd.name === normalizedName || cmd.aliases.includes(normalizedName));

    const embed = new EmbedBuilder()
      .setTitle('🔍 Command Check')
      .setDescription(`Command: \`${commandName}\``)
      .setColor(isBlacklisted ? '#F04747' : '#43B581')
      .addFields(
        {
          name: 'Status',
          value: isBlacklisted ? '🔴 Blacklisted' : '✅ Allowed',
          inline: true,
        },
        {
          name: 'Exists',
          value: commandExists ? '✅ Yes' : '❌ No',
          inline: true,
        }
      )
      .setTimestamp()
      .setFooter({
        text: `Requested by ${requestedBy}`,
        iconURL: avatarURL,
      });

    return embed;
  }

  private async loadBlacklist(client: BotClient): Promise<void> {
    try {
      const blacklistedCommands = await CommandBlacklist.find().select('commandName');
      client.commandBlacklist.clear();
      for (const cmd of blacklistedCommands) {
        client.commandBlacklist.add(cmd.commandName);
      }
      logger.info(`[CMDBLACKLIST] Loaded ${client.commandBlacklist.size} blacklisted commands`);
    } catch (error) {
      logger.error({ err: error }, '[CMDBLACKLIST] Error loading blacklist');
    }
  }

  public static async initializeBlacklist(client: BotClient): Promise<void> {
    try {
      const blacklistedCommands = await CommandBlacklist.find().select('commandName');
      client.commandBlacklist.clear();
      for (const cmd of blacklistedCommands) {
        client.commandBlacklist.add(cmd.commandName);
      }
      logger.info(`[CMDBLACKLIST] Initialized ${client.commandBlacklist.size} blacklisted commands`);
    } catch (error) {
      logger.error({ err: error }, '[CMDBLACKLIST] Error initializing blacklist');
    }
  }
}

