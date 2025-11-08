import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { Button } from '../../structures/Button';
import { botConfig } from '../../config/bot.config';
import { TimeFormat, formatBytes } from '../../utils/timeFormat';
import os from 'node:os';
import { version as discordJsVersion } from 'discord.js';
import { version as nodeVersion } from 'process';

export default class BotinfoButton extends Button {
  constructor(client: any) {
    super(client, {
      id: 'botinfo',
      customId: 'botinfo',
    });
  }

  public async execute(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.guild || !interaction.user) return;

    let view = interaction.customId.replace('botinfo_', '');
    if (!view || view === 'botinfo') view = 'overview';

    try {
      await interaction.deferUpdate();

      let embed: EmbedBuilder;
      switch (view) {
        case 'overview':
          embed = await this.createOverviewEmbed(interaction);
          break;
        case 'statistics':
          embed = await this.createStatisticsEmbed(interaction);
          break;
        case 'systeminfo':
          embed = await this.createSystemInfoEmbed(interaction);
          break;
        case 'developers':
          embed = await this.createDevelopersEmbed(interaction);
          break;
        default:
          embed = await this.createOverviewEmbed(interaction);
      }

      const buttons = this.createButtonRow(view);

      await interaction.editReply({
        embeds: [embed],
        components: [buttons],
      });
    } catch (error) {
      console.error('Botinfo button error:', error);
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

  private async createOverviewEmbed(interaction: ButtonInteraction): Promise<EmbedBuilder> {
    const bot = this.client.user;
    const lastRestart = TimeFormat.toHumanize(
      Date.now() - (this.client.uptime ?? 0)
    );

    return new EmbedBuilder()
      .setColor(botConfig.colors.main as any)
      .setTitle(`${bot?.username} Application Overview`)
      .setThumbnail(bot?.displayAvatarURL() || null)
      .setDescription(
        '**About**\n' +
          `${bot?.username} is a powerful Discord bot with advanced features, moderation tools, voice master system, and much more!`
      )
      .addFields([
        {
          name: 'Bot Information',
          value: `Version ${botConfig.version} running on Node.js ${nodeVersion}`,
          inline: false,
        },
        {
          name: 'Runtime Details',
          value: `Last restart: ${lastRestart}\nDiscord.js v${discordJsVersion}`,
          inline: false,
        },
      ])
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();
  }

  private async createStatisticsEmbed(interaction: ButtonInteraction): Promise<EmbedBuilder> {
    const totalGuilds = this.client.guilds.cache.size;
    const totalUsers = this.client.guilds.cache.reduce(
      (acc: number, guild: any) => acc + (guild.memberCount || 0),
      0
    );
    const totalChannels = this.client.channels.cache.size;

    return new EmbedBuilder()
      .setColor(botConfig.colors.main as any)
      .setTitle('📊 Statistics')
      .setDescription('**Performance Statistics**')
      .addFields([
        {
          name: 'Bot Activity',
          value: [
            `${totalGuilds.toLocaleString()} active servers`,
            `${totalUsers.toLocaleString()} users`,
            `${totalChannels.toLocaleString()} channels monitored`,
          ].join('\n'),
          inline: false,
        },
        {
          name: 'Server Presence',
          value: [
            `${totalGuilds.toLocaleString()} servers`,
            `${totalUsers.toLocaleString()} users`,
          ].join('\n'),
          inline: false,
        },
      ])
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();
  }

  private async createSystemInfoEmbed(interaction: ButtonInteraction): Promise<EmbedBuilder> {
    const osInfo = `${os.type()} ${os.release()}`;
    const cpuUsage = process.cpuUsage();
    const cpuUsagePercent = ((cpuUsage.user + cpuUsage.system) / 1024 / 1024).toFixed(1);
    const memUsage = process.memoryUsage();
    const memTotal = formatBytes(os.totalmem());
    const memFree = formatBytes(os.freemem());
    const processMemory = formatBytes(memUsage.heapUsed);
    const heapTotal = formatBytes(memUsage.heapTotal);
    const extraMemory = formatBytes(memUsage.external);
    const botUptime = TimeFormat.toHumanize(this.client.uptime ?? 0);

    return new EmbedBuilder()
      .setColor(botConfig.colors.main as any)
      .setTitle('💻 System Information')
      .addFields([
        {
          name: 'System Resources',
          value: [
            `**Processing Power:** ${os.cpus().length} CPU cores at ${cpuUsagePercent}% usage`,
            `**Memory Usage:**`,
            `Process Memory: ${processMemory}`,
            `JavaScript Heap: ${processMemory} / ${heapTotal} capacity`,
            `Extra Memory: ${extraMemory}`,
            `Objects: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}M total`,
            `System: ${memTotal} total • ${memFree} free`,
          ].join('\n'),
          inline: false,
        },
        {
          name: 'Environment',
          value: `${osInfo} ${os.arch()} • Uptime: ${botUptime}`,
          inline: false,
        },
      ])
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();
  }

  private async createDevelopersEmbed(interaction: ButtonInteraction): Promise<EmbedBuilder> {
    return new EmbedBuilder()
      .setColor(botConfig.colors.main as any)
      .setTitle('👨‍💻 Development Team')
      .setDescription(
        '**Development Team**\n\n' +
          '**Lead Developer**\n' +
          '**Bot Team** - Main Developer & Project Lead\n' +
          '• Full-stack development & architecture\n' +
          '• Discord.js v14+ expertise\n' +
          '• Advanced bot features & moderation\n\n' +
          '**Special Thanks**\n' +
          '📚 **Discord.js Team** - For the amazing library\n' +
          '❤️ **Our Community** - For amazing support\n' +
          '🤝 **Server Owners** - Who trust us'
      )
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();
  }

  private createButtonRow(activeView: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('botinfo_overview')
        .setLabel('Overview')
        .setStyle(activeView === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('botinfo_statistics')
        .setLabel('Statistics')
        .setStyle(activeView === 'statistics' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('botinfo_systeminfo')
        .setLabel('System Info')
        .setStyle(activeView === 'systeminfo' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('botinfo_developers')
        .setLabel('Developers')
        .setStyle(activeView === 'developers' ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );
  }
}

