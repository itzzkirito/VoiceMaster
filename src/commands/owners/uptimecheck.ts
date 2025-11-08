import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';
import { TimeFormat } from '../../utils/timeFormat';
import { logger } from '../../utils/logger';
import os from 'os';

/**
 * Uptime Check Command
 * Show service status for all clusters/shard information
 */
export default class UptimeCheckCommand extends Command {
  constructor() {
    super({
      name: 'uptimecheck',
      description: 'Show service status for all clusters/shard information (Owner only)',
      category: 'owner',
      ownerOnly: true,
      noPrefix: true,
      supportsMessageCommands: true,
      aliases: ['clusterstatus', 'shardstatus', 'clusterinfo'],
      cooldown: 5,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('uptimecheck')
      .setDescription('Show service status for all clusters/shard information');
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      const embed = await this.buildEmbed(
        interaction.user.tag,
        interaction.user.displayAvatarURL(),
        interaction.client
      );
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, '[UPTIMECHECK] Error');
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

  override async messageExecute({ message }: MessageCommandArgs): Promise<void> {
    try {
      const embed = await this.buildEmbed(
        message.author.tag,
        message.author.displayAvatarURL(),
        message.client
      );
      await message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, '[UPTIMECHECK] Error');
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

  private async buildEmbed(
    requestedBy: string,
    avatarURL: string,
    client: any
  ): Promise<EmbedBuilder> {
    // Bot uptime
    const botUptimeMs = client.uptime || 0;
    const botUptime = TimeFormat.toHumanize(botUptimeMs);

    // System uptime
    const systemUptimeSeconds = os.uptime();
    const systemUptimeMs = systemUptimeSeconds * 1000;
    const systemUptime = TimeFormat.toHumanize(systemUptimeMs);

    // Process uptime
    const processUptimeMs = process.uptime() * 1000;
    const processUptime = TimeFormat.toHumanize(processUptimeMs);

    // Shard information
    const shardId = client.shard?.ids?.[0] ?? 0;
    const totalShards = client.shard?.count ?? 1;
    const isReady = client.isReady();

    // Memory information
    const processMemory = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Guild and user counts
    const guildCount = client.guilds.cache.size;
    const userCount = client.guilds.cache.reduce(
      (acc: number, guild: any) => acc + (guild.memberCount || 0),
      0
    );

    // WebSocket ping
    const wsPing = Math.round(client.ws.ping);

    // Node.js and system info
    const nodeVersion = process.version;
    const platform = `${os.type()} ${os.release()}`;
    const cpuCount = os.cpus().length;

    // Build status indicators
    const getStatusEmoji = (status: boolean): string => (status ? '🟢' : '🔴');
    const getStatusText = (status: boolean): string => (status ? 'Online' : 'Offline');

    const embed = new EmbedBuilder()
      .setColor('#7289DA')
      .setTitle('⚙️ Cluster & Service Status')
      .setThumbnail(client.user?.displayAvatarURL() || null)
      .addFields(
        {
          name: '🔄 Shard Information',
          value: [
            `**Shard ID:** \`${shardId}\` / \`${totalShards}\``,
            `**Status:** ${getStatusEmoji(isReady)} ${getStatusText(isReady)}`,
            `**WebSocket Ping:** \`${wsPing}ms\``,
            `**Total Guilds:** \`${guildCount.toLocaleString()}\``,
            `**Total Users:** \`${userCount.toLocaleString()}\``,
          ].join('\n'),
          inline: false,
        },
        {
          name: '⏱️ Uptime Information',
          value: [
            `**Bot Uptime:** \`${botUptime}\``,
            `**Process Uptime:** \`${processUptime}\``,
            `**System Uptime:** \`${systemUptime}\``,
          ].join('\n'),
          inline: true,
        },
        {
          name: '💾 Memory Usage',
          value: [
            `**Process Heap:** \`${TimeFormat.formatBytes(processMemory.heapUsed)}\``,
            `**Process RSS:** \`${TimeFormat.formatBytes(processMemory.rss)}\``,
            `**System Used:** \`${TimeFormat.formatBytes(usedMem)}\` / \`${TimeFormat.formatBytes(totalMem)}\``,
            `**System Free:** \`${TimeFormat.formatBytes(freeMem)}\``,
          ].join('\n'),
          inline: true,
        },
        {
          name: '🖥️ System Information',
          value: [
            `**Platform:** \`${platform}\``,
            `**Architecture:** \`${os.arch()}\``,
            `**CPU Cores:** \`${cpuCount}\``,
            `**Node.js:** \`${nodeVersion}\``,
            `**Process ID:** \`${process.pid}\``,
          ].join('\n'),
          inline: false,
        }
      )
      .setFooter({
        text: `Requested by ${requestedBy}`,
        iconURL: avatarURL,
      })
      .setTimestamp();

    return embed;
  }
}

