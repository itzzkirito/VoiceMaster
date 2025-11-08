import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';

export default class PingCommand extends Command {
  constructor() {
    super({
      name: 'ping',
      description: 'Check the bot\'s latency',
      category: 'general',
      aliases: ['p', 'latency'],
      noPrefix: true,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Check the bot\'s latency');
  }

  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.reply({
      embeds: [embeds.info('Pinging...', 'Calculating latency...')],
      fetchReply: true,
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply({
      embeds: [
        embeds.success(
          'Pong!',
          `**Latency:** ${latency}ms\n**API Latency:** ${apiLatency}ms`
        ),
      ],
    });
  }

  override async messageExecute({ message }: MessageCommandArgs) {
    const sent = await message.reply({
      embeds: [embeds.info('Pinging...', 'Calculating latency...')],
    });

    const latency = sent.createdTimestamp - message.createdTimestamp;
    const apiLatency = Math.round(message.client.ws.ping);

    await sent.edit({
      embeds: [
        embeds.success(
          'Pong!',
          `**Latency:** ${latency}ms\n**API Latency:** ${apiLatency}ms`
        ),
      ],
    });
  }
}

