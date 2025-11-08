import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  codeBlock,
} from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default class ExecCommand extends Command {
  constructor() {
    super({
      name: 'exec',
      description: 'Execute shell command (Owner only)',
      category: 'owner',
      ownerOnly: true,
      noPrefix: true,
      supportsMessageCommands: true,
      cooldown: 0,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('exec')
      .setDescription('Execute shell command (Owner only)')
      .addStringOption((option) =>
        option
          .setName('command')
          .setDescription('Shell command to execute')
          .setRequired(true)
      );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = interaction.options.getString('command', true);

    try {
      await interaction.deferReply({ ephemeral: true });

      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
      const output = stdout || stderr || 'No output';
      const truncatedOutput = output.length > 1900 ? output.substring(0, 1900) + '...' : output;

      await interaction.editReply({
        embeds: [
          embeds.success(
            'Command Executed',
            codeBlock('bash', truncatedOutput)
          ),
        ],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const truncatedError = errorMessage.length > 1900 ? errorMessage.substring(0, 1900) + '...' : errorMessage;

      await interaction.editReply({
        embeds: [
          embeds.error(
            'Execution Error',
            codeBlock('bash', truncatedError)
          ),
        ],
      });
    }
  }

  override async messageExecute({ message, args }: MessageCommandArgs): Promise<void> {
    const command = args.join(' ');

    if (!command) {
      await message.reply({
        embeds: [embeds.error('Error', 'Please provide a command to execute.')],
      });
      return;
    }

    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
      const output = stdout || stderr || 'No output';
      const truncatedOutput = output.length > 1900 ? output.substring(0, 1900) + '...' : output;

      await message.reply({
        embeds: [
          embeds.success(
            'Command Executed',
            codeBlock('bash', truncatedOutput)
          ),
        ],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const truncatedError = errorMessage.length > 1900 ? errorMessage.substring(0, 1900) + '...' : errorMessage;

      await message.reply({
        embeds: [
          embeds.error(
            'Execution Error',
            codeBlock('bash', truncatedError)
          ),
        ],
      });
    }
  }
}

