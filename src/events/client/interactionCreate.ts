import {
  Interaction,
  ChatInputCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
  ChannelSelectMenuInteraction,
  MessageFlags,
} from 'discord.js';
import { Event } from '../../structures/Event';
import { logger } from '../../utils/logger';
import { errorHandler } from '../../utils/errorHandler';
import { embeds } from '../../utils/embeds';
import { commands } from '../../commands';
import { webhookService } from '../../services/webhookService';
import { cooldownManager } from '../../utils/cooldownManager';
import { buttons } from '../../components/buttons';
import { menus } from '../../components/menus';
import { BotClient } from '../../client';
import { env } from '../../config/env.config';

export default class InteractionCreateEvent extends Event<'interactionCreate'> {
  constructor() {
    super({
      name: 'interactionCreate',
      once: false,
    });
  }

  async execute(interaction: Interaction) {
    const client = interaction.client as BotClient;

    // Handle Button Interactions
    if (interaction.isButton()) {
      await this.handleButtonInteraction(interaction as ButtonInteraction, client);
      return;
    }

    // Handle Select Menu Interactions
    if (
      interaction.isUserSelectMenu() ||
      interaction.isStringSelectMenu() ||
      interaction.isChannelSelectMenu()
    ) {
      await this.handleSelectMenuInteraction(interaction, client);
      return;
    }

    // Handle Command Interactions
    if (!interaction.isChatInputCommand()) return;

    const botClient = client as BotClient;

    // Get command early to validate it exists
    const command = commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`Command ${interaction.commandName} not found`);
      return;
    }

    // Validate command access (early returns for common checks)
    // Check if command is blacklisted
    if (botClient.commandBlacklist.has(interaction.commandName.toLowerCase())) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'This command has been disabled.')],
        ephemeral: true,
      });
      return;
    }

    // Check if command is guild-only
    if (command.guildOnly && !interaction.guild) {
      await interaction.reply({
        embeds: [embeds.error('Error', 'This command can only be used in a server.')],
        ephemeral: true,
      });
      return;
    }

    // Check owner-only commands (cache owner check for performance)
    if (command.ownerOnly) {
      const userId = interaction.user.id;
      const isOwner = userId === env.OWNER_ID || env.DEVELOPER_IDS.includes(userId);
      if (!isOwner) {
        await interaction.reply({
          embeds: [embeds.error('Error', 'This command can only be used by the bot owner.')],
          ephemeral: true,
        });
        return;
      }
    }

    // Check permissions (only in guilds)
    if (command.permissions && interaction.inGuild() && interaction.member) {
      const member = interaction.member;
      if (
        typeof member.permissions !== 'string' &&
        !member.permissions.has(command.permissions)
      ) {
        await interaction.reply({
          embeds: [embeds.error('Error', 'You do not have permission to use this command.')],
          ephemeral: true,
        });
        return;
      }
    }

    // Check cooldown
    const remainingCooldown = cooldownManager.checkCooldown(
      interaction.user.id,
      command.name,
      command.cooldown
    );

    if (remainingCooldown > 0) {
      const cooldownTime = cooldownManager.formatCooldown(remainingCooldown);
      await interaction.reply({
        embeds: [
          embeds.warning(
            'Command on Cooldown',
            `Please wait ${cooldownTime} before using this command again.`
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    try {
      await command.execute(interaction as ChatInputCommandInteraction);
      logger.debug(`Command ${command.name} executed by ${interaction.user.tag}`);

      // Send command log webhook (non-blocking)
      webhookService.sendCommandLog(
        command.name,
        interaction.user.id,
        interaction.user.tag,
        interaction.guild?.id,
        interaction.guild?.name
      ).catch((error) => {
        logger.debug('Failed to send command log webhook', error instanceof Error ? error : undefined);
      });
    } catch (error) {
      errorHandler.handle(error, `Command: ${command.name}`);

      // Send error webhook (non-blocking)
      webhookService.sendErrorLog(
        error instanceof Error ? error : new Error(String(error)),
        `Command: ${command.name}`
      ).catch((webhookError) => {
        logger.debug('Failed to send error webhook', webhookError instanceof Error ? webhookError : undefined);
      });

      const errorEmbed = errorHandler.createErrorEmbed(error, 'Command Error');

      // Handle interaction response safely
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      } catch (replyError) {
        logger.error('Failed to send error response to user', replyError instanceof Error ? replyError : undefined);
      }
    }
  }

  private async handleButtonInteraction(
    interaction: ButtonInteraction,
    _client: BotClient
  ): Promise<void> {
    try {
      const customId = interaction.customId;

      // Check if interaction is still valid
      if (
        interaction.message.interaction &&
        interaction.message.interaction.user.id !== interaction.user.id
      ) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply({
              content: 'This interaction is not for you.',
              flags: MessageFlags.Ephemeral,
            })
            .catch(() => {});
        }
        return;
      }

      // Handle botinfo button interactions (special case - multiple buttons share same handler)
      if (customId.startsWith('botinfo_')) {
        const botinfoButton = buttons.get('botinfo');
        if (botinfoButton) {
          await botinfoButton.execute(interaction);
        }
        return;
      }

      // Handle other button interactions from registered handlers
      const button = buttons.get(customId);

      if (button && typeof button.execute === 'function') {
        try {
          await button.execute(interaction);
        } catch (error) {
          logger.error(`Error executing button handler for ${customId}:`, error);

          if (!interaction.replied && !interaction.deferred) {
            await interaction
              .reply({
                content: 'An error occurred while processing your request.',
                flags: MessageFlags.Ephemeral,
              })
              .catch(() => {});
          }
        }
        return;
      }

      // Log unhandled buttons for debugging
      logger.debug(`[BUTTON] Unhandled button interaction: ${customId}`);

      // Try to defer update for unhandled buttons to prevent "interaction failed" errors
      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferUpdate().catch(() => {
          // Ignore errors - interaction may have expired
        });
      }
    } catch (error) {
      logger.error(`Error in handleButtonInteraction:`, error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({
            content: 'An error occurred while processing your request.',
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {});
      }
    }
  }

  private async handleSelectMenuInteraction(
    interaction:
      | StringSelectMenuInteraction
      | UserSelectMenuInteraction
      | ChannelSelectMenuInteraction,
    _client: BotClient
  ): Promise<void> {
    try {
      const customId = interaction.customId;

      // Check if interaction is still valid
      if (
        interaction.message.interaction &&
        interaction.message.interaction.user.id !== interaction.user.id
      ) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply({
              content: 'This interaction is not for you.',
              flags: MessageFlags.Ephemeral,
            })
            .catch(() => {});
        }
        return;
      }

      const menu = menus.get(customId);

      if (menu && typeof menu.execute === 'function') {
        try {
          await menu.execute(interaction);
        } catch (error) {
          logger.error(`Error executing menu handler for ${customId}:`, error);

          if (!interaction.replied && !interaction.deferred) {
            await interaction
              .reply({
                content: 'An error occurred while processing your request.',
                flags: MessageFlags.Ephemeral,
              })
              .catch(() => {});
          }
        }
        return;
      }

      // Log unhandled menus for debugging
      logger.debug(`[MENU] Unhandled select menu interaction: ${customId}`);

      // Try to defer update for unhandled menus
      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferUpdate().catch(() => {});
      }
    } catch (error) {
      logger.error(`Error in handleSelectMenuInteraction:`, error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({
            content: 'An error occurred while processing your request.',
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {});
      }
    }
  }
}

