import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { botConfig } from '../../config/bot.config';
import { embeds } from '../../utils/embeds';
import { voiceMasterEmojis, emojis } from '../../config/emojis.config';
import {
  getVoiceCreatorByGuildId,
  updateVoiceCreator,
  deleteVoiceCreator,
} from '../../models/VoiceCreator';

export default class VoicemasterCommand extends Command {
  constructor() {
    super({
      name: 'voicemaster',
      description: 'Manage VoiceMaster system - setup private voice channels',
      category: 'voice',
      aliases: ['vm', 'vmaster'],
      cooldown: 5,
      permissions: [PermissionFlagsBits.ManageChannels],
      guildOnly: true,
      supportsMessageCommands: true,
      noPrefix: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('voicemaster')
      .setDescription('Manage VoiceMaster system - setup private voice channels')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('setup')
          .setDescription('Setup the voice master system')
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('reset')
          .setDescription('Reset the voice master system')
      );
  }

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'setup') {
      await this.handleSetup(interaction);
    } else if (subcommand === 'reset') {
      await this.handleReset(interaction);
    }
  }

  override async messageExecute({ message, args }: MessageCommandArgs) {
    const subcommand = args[0]?.toLowerCase();

    if (subcommand === 'setup') {
      // Store the reply message so we can edit it later
      let replyMessage: any = null;
      
      // Convert message to interaction-like object for reuse
      const fakeInteraction = {
        guild: message.guild!,
        channel: message.channel,
        user: message.author,
        member: message.member,
        client: message.client, // Add client property
        reply: async (options: any) => {
          replyMessage = await message.reply(options);
          return replyMessage;
        },
        editReply: async (options: any) => {
          if (replyMessage) {
            return await replyMessage.edit(options);
          } else {
            // If no reply message exists, send a new message
            // This should rarely happen, but handle it gracefully
            if (message.channel && 'send' in message.channel && typeof message.channel.send === 'function') {
              return await (message.channel as TextChannel).send(options);
            } else {
              // Fallback: just reply to the original message
              return await message.reply(options);
            }
          }
        },
        options: {
          getSubcommand: () => 'setup',
        },
      } as any;
      await this.handleSetup(fakeInteraction);
    } else if (subcommand === 'reset') {
      // Store the reply message so we can edit it later
      let replyMessage: any = null;
      
      const fakeInteraction = {
        guild: message.guild!,
        channel: message.channel,
        user: message.author,
        member: message.member,
        client: message.client, // Add client property
        reply: async (options: any) => {
          replyMessage = await message.reply(options);
          return replyMessage;
        },
        editReply: async (options: any) => {
          if (replyMessage) {
            return await replyMessage.edit(options);
          } else {
            // If no reply message exists, send a new message
            // This should rarely happen, but handle it gracefully
            if (message.channel && 'send' in message.channel && typeof message.channel.send === 'function') {
              return await (message.channel as TextChannel).send(options);
            } else {
              // Fallback: just reply to the original message
              return await message.reply(options);
            }
          }
        },
        options: {
          getSubcommand: () => 'reset',
        },
      } as any;
      await this.handleReset(fakeInteraction);
    } else {
      await message.reply({
        embeds: [
          embeds.error(
            'Invalid Subcommand',
            'Use `setup` or `reset` subcommand.\nExample: `/voicemaster setup` or `!voicemaster setup`'
          ),
        ],
      });
    }
  }

  private async handleSetup(interaction: any) {
    if (!interaction.guild) {
      return interaction.reply({
        embeds: [embeds.error('Error', 'This command can only be used in a server.')],
      });
    }

    try {
      const existing = await getVoiceCreatorByGuildId(interaction.guild.id);
      if (existing) {
        return interaction.reply({
          embeds: [
            embeds.error(
              'Already Configured',
              'VoiceMaster is already configured in this server.\nUse `/voicemaster reset` to reset it.'
            ),
          ],
        });
      }

      // Check bot permissions
      if (!interaction.client?.user) {
        throw new Error('Client user not available');
      }
      
      const botMember = await interaction.guild.members.fetch(
        interaction.client.user.id
      );
      if (
        !botMember.permissions.has([
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageRoles,
        ])
      ) {
        return interaction.reply({
          embeds: [
            embeds.error(
              'Missing Permissions',
              'I need `Manage Channels` and `Manage Roles` permissions to set up VoiceMaster.'
            ),
          ],
        });
      }

      await interaction.reply({
        embeds: [embeds.info('Setting Up...', 'Creating VoiceMaster channels...')],
      });

      // Create category
      const category = await interaction.guild.channels.create({
        name: `${emojis.general.voice} Private Channels`,
        type: ChannelType.GuildCategory,
      });

      // Create voice channel
      const voiceChannel = await interaction.guild.channels.create({
        name: `${voiceMasterEmojis.increase} Join to Create`,
        parent: category.id,
        type: ChannelType.GuildVoice,
        userLimit: 1,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
            ],
            deny: [PermissionFlagsBits.Speak],
          },
        ],
      });

      // Create text channel
      const textChannel = await interaction.guild.channels.create({
        name: 'voice-interface',
        parent: category.id,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.CreatePublicThreads,
              PermissionFlagsBits.CreatePrivateThreads,
              PermissionFlagsBits.ManageThreads,
            ],
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ],
      });

      // Create interface embed
      const interfaceEmbed = new EmbedBuilder()
        .setDescription(
          '**VoiceMaster Control Panel**\n\n' +
            'Use the buttons below to manage your private voice channel:\n\n' +
            `${voiceMasterEmojis.lock} **Lock** - Lock your channel\n` +
            `${voiceMasterEmojis.unlock} **Unlock** - Unlock your channel\n` +
            `${voiceMasterEmojis.hide} **Hide** - Hide your channel\n` +
            `${voiceMasterEmojis.unhide} **Unhide** - Show your channel\n` +
            `${voiceMasterEmojis.info} **Info** - View channel information\n` +
            `${voiceMasterEmojis.disconnect} **Disconnect** - Disconnect a user\n` +
            `${voiceMasterEmojis.claim} **Claim** - Claim ownership if owner left\n` +
            `${voiceMasterEmojis.activity} **Activity** - Start an activity\n` +
            `${voiceMasterEmojis.increase} **Increase Limit** - Increase user limit\n` +
            `${voiceMasterEmojis.decrease} **Decrease Limit** - Decrease user limit`
        )
        .setColor(botConfig.colors.main as any)
        .setAuthor({
          name: interaction.guild.name,
          iconURL: interaction.guild.iconURL() || undefined,
        })
        .setTimestamp();

      // Create buttons (emoji only, no text)
      const lockButton = new ButtonBuilder()
        .setCustomId('voice-lock')
        .setEmoji(voiceMasterEmojis.lock)
        .setStyle(ButtonStyle.Secondary);

      const unlockButton = new ButtonBuilder()
        .setCustomId('voice-unlock')
        .setEmoji(voiceMasterEmojis.unlock)
        .setStyle(ButtonStyle.Secondary);

      const hideButton = new ButtonBuilder()
        .setCustomId('voice-hide')
        .setEmoji(voiceMasterEmojis.hide)
        .setStyle(ButtonStyle.Secondary);

      const unhideButton = new ButtonBuilder()
        .setCustomId('voice-unhide')
        .setEmoji(voiceMasterEmojis.unhide)
        .setStyle(ButtonStyle.Secondary);

      const viewButton = new ButtonBuilder()
        .setCustomId('voice-view')
        .setEmoji(voiceMasterEmojis.info)
        .setStyle(ButtonStyle.Secondary);

      const disconnectButton = new ButtonBuilder()
        .setCustomId('voice-disconnect')
        .setEmoji(voiceMasterEmojis.disconnect)
        .setStyle(ButtonStyle.Secondary);

      const claimButton = new ButtonBuilder()
        .setCustomId('voice-claim')
        .setEmoji(voiceMasterEmojis.claim)
        .setStyle(ButtonStyle.Secondary);

      const activityButton = new ButtonBuilder()
        .setCustomId('voice-activity')
        .setEmoji(voiceMasterEmojis.activity)
        .setStyle(ButtonStyle.Secondary);

      const increaseButton = new ButtonBuilder()
        .setCustomId('voice-increase-limit')
        .setEmoji(voiceMasterEmojis.increase)
        .setStyle(ButtonStyle.Secondary);

      const decreaseButton = new ButtonBuilder()
        .setCustomId('voice-decrease-limit')
        .setEmoji(voiceMasterEmojis.decrease)
        .setStyle(ButtonStyle.Secondary);

      const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        lockButton,
        unlockButton,
        hideButton,
        unhideButton,
        viewButton
      );

      const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        disconnectButton,
        claimButton,
        activityButton,
        increaseButton,
        decreaseButton
      );

      await textChannel.send({
        embeds: [interfaceEmbed],
        components: [row1, row2],
      });

      // Save to database
      await updateVoiceCreator(interaction.guild.id, category.id, {
        voiceChannelId: voiceChannel.id,
        textChannelId: textChannel.id,
        categoryId: category.id,
      });

      await interaction.editReply({
        embeds: [
          embeds.success(
            'VoiceMaster Setup Complete',
            `Successfully set up VoiceMaster!\n\n` +
              `**Category:** ${category.name}\n` +
              `**Voice Channel:** ${voiceChannel}\n` +
              `**Control Panel:** ${textChannel}\n\n` +
              `Users can now join the voice channel to create their own private room.`
          ),
        ],
      });
    } catch (error) {
      console.error('VoiceMaster setup error:', error);
      await interaction.editReply({
        embeds: [
          embeds.error(
            'Setup Failed',
            'An error occurred while setting up VoiceMaster. Please check my permissions and try again.'
          ),
        ],
      });
    }
  }

  private async handleReset(interaction: any) {
    if (!interaction.guild) {
      return interaction.reply({
        embeds: [embeds.error('Error', 'This command can only be used in a server.')],
      });
    }

    try {
      const voiceMaster = await getVoiceCreatorByGuildId(interaction.guild.id);
      if (!voiceMaster) {
        return interaction.reply({
          embeds: [
            embeds.error(
              'Not Configured',
              'VoiceMaster is not configured in this server.\nUse `/voicemaster setup` to set it up.'
            ),
          ],
        });
      }

      // Delete channels
      try {
        const category = await interaction.guild.channels.fetch(voiceMaster.categoryId);
        const voiceChannel = await interaction.guild.channels.fetch(
          voiceMaster.voiceChannelId
        );
        const textChannel = await interaction.guild.channels.fetch(
          voiceMaster.textChannelId
        );

        if (category) await category.delete().catch(() => {});
        if (voiceChannel) await voiceChannel.delete().catch(() => {});
        if (textChannel) await textChannel.delete().catch(() => {});
      } catch (error) {
        // Channels may already be deleted
        console.error('Error deleting channels:', error);
      }

      // Delete from database
      await deleteVoiceCreator(interaction.guild.id);

      await interaction.reply({
        embeds: [
          embeds.success(
            'VoiceMaster Reset',
            'VoiceMaster has been successfully reset and all channels have been deleted.'
          ),
        ],
      });
    } catch (error) {
      console.error('VoiceMaster reset error:', error);
      await interaction.reply({
        embeds: [
          embeds.error(
            'Reset Failed',
            'An error occurred while resetting VoiceMaster. Please try again.'
          ),
        ],
      });
    }
  }
}

