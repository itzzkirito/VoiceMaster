import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';
import { loadCommands } from '../../commands';

export default class ReloadCommand extends Command {
  constructor() {
    super({
      name: 'reload',
      description: 'Reload all commands (Owner only)',
      category: 'owner',
      ownerOnly: true,
      noPrefix: true,
      supportsMessageCommands: true,
      cooldown: 0,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('reload')
      .setDescription('Reload all commands (Owner only)');
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      await interaction.deferReply({ ephemeral: true });

      // Reload commands
      loadCommands();

      await interaction.editReply({
        embeds: [
          embeds.success(
            'Commands Reloaded',
            '✅ All commands have been reloaded successfully!'
          ),
        ],
      });
    } catch (error) {
      await interaction.editReply({
        embeds: [
          embeds.error(
            'Reload Error',
            `Failed to reload commands: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
      });
    }
  }

  override async messageExecute({ message, args: _args }: MessageCommandArgs): Promise<void> {
    try {
      // Reload commands
      loadCommands();

      await message.reply({
        embeds: [
          embeds.success(
            'Commands Reloaded',
            '✅ All commands have been reloaded successfully!'
          ),
        ],
      });
    } catch (error) {
      await message.reply({
        embeds: [
          embeds.error(
            'Reload Error',
            `Failed to reload commands: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
      });
    }
  }
}

