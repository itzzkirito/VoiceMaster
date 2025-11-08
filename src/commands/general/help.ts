import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command, MessageCommandArgs } from '../../structures/Command';
import { embeds } from '../../utils/embeds';
import { colors } from '../../utils/constants';
import { commands } from '../index';
import { botConfig } from '../../config/bot.config';
import { env } from '../../config/env.config';
import { emojis } from '../../config/emojis.config';

export default class HelpCommand extends Command {
  constructor() {
    super({
      name: 'help',
      description: 'Display help information',
      category: 'general',
      aliases: ['h', 'commands'],
      noPrefix: true, // Allow users with noPrefix access to use this command without prefix
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('help')
      .setDescription('Display help information')
      .addStringOption(option =>
        option
          .setName('command')
          .setDescription('Get help for a specific command')
          .setRequired(false)
      );
  }

  async execute(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString('command');

    if (commandName) {
      // Show help for specific command
      const command = commands.get(commandName);
      if (!command) {
        await interaction.reply({
          embeds: [embeds.error('Command Not Found', `The command \`${commandName}\` does not exist.`)],
          ephemeral: true,
        });
        return;
      }

      const embed = this.createCommandHelpEmbed(command);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Show general help
    const userId = interaction.user.id;
    const embed = this.createGeneralHelpEmbed(true, userId);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  override async messageExecute({ message, args }: MessageCommandArgs) {
    const commandName = args[0]?.toLowerCase();

    if (commandName) {
      // Show help for specific command
      let command = commands.get(commandName);
      if (!command) {
        // Search by alias
        command = commands.find(
          (cmd) => cmd.aliases.includes(commandName) || cmd.name === commandName
        );
      }
      
      if (!command) {
        await message.reply({
          embeds: [embeds.error('Command Not Found', `The command \`${commandName}\` does not exist.`)],
        });
        return;
      }

      const embed = this.createCommandHelpEmbed(command);
      await message.reply({ embeds: [embed] });
      return;
    }

    // Show general help
    const userId = message.author.id;
    const embed = this.createGeneralHelpEmbed(false, userId);
    await message.reply({ embeds: [embed] });
  }

  private createCommandHelpEmbed(command: Command): EmbedBuilder {
    const categoryEmoji = this.getCategoryEmoji(command.category || 'general');
    const cooldownSeconds = (command.cooldown / 1000).toFixed(1);
    
    const embed = new EmbedBuilder()
      .setColor(colors.primary)
      .setAuthor({ 
        name: 'Command Information',
        iconURL: 'https://cdn.discordapp.com/emojis/1234567890.png' // Optional: Add bot icon
      })
      .setTitle(`${categoryEmoji} ${command.name.toUpperCase()}`)
      .setDescription(`> ${command.description}\n\u200B`)
      .setTimestamp()
      .setFooter({ text: 'Bot Help System • Use /help to see all commands' });

    // Command Details Section
    const details = [
      `${emojis.categories[command.category as keyof typeof emojis.categories] || emojis.general.command} **Category:** \`${(command.category || 'general').charAt(0).toUpperCase() + (command.category || 'general').slice(1)}\``,
      `${emojis.status.loading} **Cooldown:** \`${cooldownSeconds}s\``,
      command.ownerOnly ? `${emojis.categories.owner} **Owner Only:** Yes` : null,
      command.noPrefix ? `${emojis.status.checkmark} **No Prefix:** Enabled` : null,
    ].filter(Boolean);

    embed.addFields({
      name: `${emojis.status.info} Details`,
      value: details.join('\n'),
      inline: false,
    });

    // Aliases Section
    if (command.aliases.length > 0) {
      embed.addFields({
        name: `${emojis.general.settings} Aliases`,
        value: command.aliases.map(a => `\`${a}\``).join(' • '),
        inline: false,
      });
    }

    // Usage Section
    const usage = [
      `${emojis.actions.play} **Slash Command**`,
      `\`\`\`/${command.name}\`\`\``,
      `${emojis.general.command} **Prefix Command**`,
      `\`\`\`${botConfig.prefix}${command.name}\`\`\``,
      `${emojis.general.bot} **Mention Command**`,
      `\`\`\`@bot ${command.name}\`\`\``,
    ];
    
    embed.addFields({
      name: `${emojis.general.settings} Usage Examples`,
      value: usage.join('\n'),
      inline: false,
    });

    return embed;
  }

  private createGeneralHelpEmbed(isSlash: boolean, userId: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(colors.primary)
      .setAuthor({ 
        name: 'Command Menu',
        iconURL: 'https://cdn.discordapp.com/emojis/1234567890.png' // Optional: Add bot icon
      })
      .setTitle(`${emojis.general.bot} ${botConfig.name} Help Center`)
      .setDescription(
        isSlash
          ? `> ${emojis.status.info} Browse all available commands below.\n> Use \`/help <command>\` for detailed information.\n\u200B`
          : `> ${emojis.status.info} Browse all available commands below.\n> Use \`${botConfig.prefix}help <command>\` for detailed information.\n\u200B`
      )
      .setTimestamp()
      .setFooter({ text: `${commands.size} commands available • Powered by Discord.js` });

    // Group commands by category
    const categories = new Map<string, string[]>();
    
    // Check if user is owner (for showing owner commands)
    const isOwner = userId === env.OWNER_ID || env.DEVELOPER_IDS.includes(userId);
    
    commands.forEach((cmd) => {
      // Skip owner commands if user is not owner
      if (cmd.ownerOnly && !isOwner) return;
      
      if (!cmd.supportsMessageCommands && !isSlash) return;
      
      const category = cmd.category || 'general';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      
      const commandList = categories.get(category)!;
      const prefix = isSlash ? '/' : botConfig.prefix;
      commandList.push(`\`${prefix}${cmd.name}\` • ${cmd.description}`);
    });

    // Sort categories for consistent display
    const sortedCategories = Array.from(categories.entries()).sort((a, b) => {
      const order = ['general', 'voice', 'voicemaster', 'admin', 'owners'];
      const aIndex = order.indexOf(a[0]);
      const bIndex = order.indexOf(b[0]);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    sortedCategories.forEach(([category, cmds]) => {
      const categoryEmoji = this.getCategoryEmoji(category);
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      
      embed.addFields({
        name: `${categoryEmoji} ${categoryName} (${cmds.length})`,
        value: cmds.join('\n') || 'No commands',
        inline: false,
      });
    });

    // Add helpful footer information
    embed.addFields({
      name: `${emojis.status.info} How to Use Commands`,
      value: [
        `${emojis.actions.play} **Slash:** \`/<command>\``,
        `${emojis.general.command} **Prefix:** \`${botConfig.prefix}<command>\``,
        `${emojis.general.bot} **Mention:** \`@${botConfig.name} <command>\``,
      ].join('\n'),
      inline: false,
    });

    return embed;
  }

  private getCategoryEmoji(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'general': emojis.categories.general,
      'admin': emojis.categories.admin,
      'voice': emojis.categories.voice,
      'voicemaster': emojis.general.voice,
      'owners': emojis.categories.owner,
      'moderation': emojis.categories.moderation,
      'music': emojis.categories.music,
      'fun': emojis.categories.fun,
      'utility': emojis.categories.utility,
    };
    
    return categoryMap[category.toLowerCase()] || emojis.general.command;
  }
}

