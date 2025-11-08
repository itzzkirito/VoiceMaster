import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandOptionsOnlyBuilder,
  PermissionResolvable,
  Message,
} from 'discord.js';
import { botConfig } from '../config/bot.config';

export interface CommandOptions {
  name: string;
  description: string;
  category?: string;
  cooldown?: number;
  permissions?: PermissionResolvable[];
  guildOnly?: boolean;
  ownerOnly?: boolean;
  aliases?: string[]; // For prefix commands
  supportsMessageCommands?: boolean; // Whether command supports prefix/mention
  noPrefix?: boolean; // Whether command can be used without prefix
}

export interface MessageCommandArgs {
  message: Message;
  args: string[];
}

export abstract class Command {
  public readonly name: string;
  public readonly description: string;
  public readonly category: string;
  public readonly cooldown: number;
  public readonly permissions?: PermissionResolvable[];
  public readonly guildOnly: boolean;
  public readonly ownerOnly: boolean;
  public readonly aliases: string[];
  public readonly supportsMessageCommands: boolean;
  public readonly noPrefix: boolean;

  constructor(public readonly options: CommandOptions) {
    this.name = options.name;
    this.description = options.description;
    this.category = options.category || 'general';
    this.cooldown = options.cooldown || botConfig.commands.cooldown;
    // Handle optional permissions with exactOptionalPropertyTypes
    if (options.permissions !== undefined) {
      this.permissions = options.permissions;
    }
    this.guildOnly = options.guildOnly ?? false;
    this.ownerOnly = options.ownerOnly ?? false;
    this.aliases = options.aliases || [];
    this.supportsMessageCommands = options.supportsMessageCommands ?? true;
    this.noPrefix = options.noPrefix ?? false;
  }

  abstract build(): 
    | SlashCommandBuilder 
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;

  abstract execute(interaction: ChatInputCommandInteraction): Promise<void>;

  // Optional method for message-based commands (prefix/mention)
  // Override this in commands that support message-based execution
  async messageExecute({ message, args: _args }: MessageCommandArgs): Promise<void> {
    // Default implementation sends a message explaining to use slash commands
    await message.reply({
      embeds: [
        {
          title: '⚠️ Slash Command Required',
          description: `This command is only available as a slash command. Please use \`/${this.name}\` instead.`,
          color: 0xffa500,
        },
      ],
    });
  }
}

