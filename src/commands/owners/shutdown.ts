import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';
import { webhookService } from '../../services/webhookService';

export default class ShutdownCommand extends Command {
  constructor() {
    super({
      name: 'shutdown',
      description: 'Shutdown the bot (Owner only)',
      category: 'owner',
      ownerOnly: true,
      noPrefix: true,
      supportsMessageCommands: true,
      cooldown: 0,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('shutdown')
      .setDescription('Shutdown the bot (Owner only)');
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({
      embeds: [
        embeds.success(
          'Shutting Down',
          '🛑 Bot is shutting down...'
        ),
      ],
      ephemeral: true,
    });

    webhookService.sendDestroyLog('Shutdown command executed');
    
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }

  override async messageExecute({ message, args: _args }: MessageCommandArgs): Promise<void> {
    await message.reply({
      embeds: [
        embeds.success(
          'Shutting Down',
          '🛑 Bot is shutting down...'
        ),
      ],
    });

    webhookService.sendDestroyLog('Shutdown command executed');
    
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

