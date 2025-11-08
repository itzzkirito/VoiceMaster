import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { botConfig } from '../../config/bot.config';
import { TimeFormat } from '../../utils/timeFormat';
import { version as discordJsVersion } from 'discord.js';
import { version as nodeVersion } from 'process';

export default class InfoCommand extends Command {
  constructor() {
    super({
      name: 'info',
      description: 'Display bot information',
      category: 'general',
      noPrefix: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('info')
      .setDescription('Display bot information');
  }

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = await this.createOverviewEmbed(interaction);
    const buttons = this.createButtonRow('overview');

    await interaction.reply({ embeds: [embed], components: [buttons] });
  }

  override async messageExecute({ message }: MessageCommandArgs) {
    const embed = await this.createOverviewEmbed(message as any);
    const buttons = this.createButtonRow('overview');

    await message.reply({ embeds: [embed], components: [buttons] });
  }

  private async createOverviewEmbed(interaction: any): Promise<EmbedBuilder> {
    const { client } = interaction;
    const bot = client.user;
    const lastRestart = TimeFormat.toHumanize(Date.now() - (client.uptime ?? 0));

    return new EmbedBuilder()
      .setColor(botConfig.colors.main as any)
      .setTitle(`${bot?.username || botConfig.name} Application Overview`)
      .setThumbnail(bot?.displayAvatarURL() || null)
      .setDescription(
        '**About**\n' +
          `${bot?.username || botConfig.name} is a powerful Discord bot with advanced features, moderation tools, voice master system, and much more!`
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
        {
          name: 'Statistics',
          value: [
            `${client.guilds.cache.size.toLocaleString()} servers`,
            `${client.users.cache.size.toLocaleString()} users`,
            `${client.channels.cache.size.toLocaleString()} channels`,
          ].join('\n'),
          inline: false,
        },
      ])
      .setFooter({
        text: `Requested by ${interaction.user?.tag || interaction.author?.tag}`,
        iconURL: interaction.user?.displayAvatarURL() || interaction.author?.displayAvatarURL(),
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

