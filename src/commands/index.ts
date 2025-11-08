import { Collection } from 'discord.js';
import { Command } from '../structures/Command';
import { logger } from '../utils/logger';

// Import all commands
import PingCommand from './general/ping';
import HelpCommand from './general/help';
import InfoCommand from './general/info';
import BanCommand from './admin/ban';
import KickCommand from './admin/kick';
import MuteCommand from './admin/mute';
import SetPrefixCommand from './admin/setprefix';
import VoicemasterCommand from './voicemaster/Voicemaster';
import { loadVoiceCommands, voiceCommands } from './voice';
import { loadOwnerCommands, ownerCommands } from './owners';

export const commands = new Collection<string, Command>();

// Register all commands
const commandClasses = [
  PingCommand,
  HelpCommand,
  InfoCommand,
  BanCommand,
  KickCommand,
  MuteCommand,
  SetPrefixCommand,
  VoicemasterCommand,
];

export function loadCommands(): void {
  // Clear existing commands
  commands.clear();

  let loadedCount = 0;
  let errorCount = 0;
  const errors: Array<{ name: string; error: Error }> = [];

  // Load main commands
  for (const CommandClass of commandClasses) {
    try {
      // Store class name for error reporting
      const className = CommandClass?.name ?? 'Unknown';
      
      // Validate CommandClass is a constructor
      if (typeof CommandClass !== 'function') {
        const error = new Error(`Command class ${className} is not a constructor`);
        logger.error(`Invalid command class: ${className}`, error);
        errors.push({ name: className, error });
        errorCount++;
        continue;
      }

      const command = new CommandClass();
      
      // Validate command structure
      if (!command.name || typeof command.name !== 'string') {
        const error = new Error(`Command ${className} has invalid or missing name`);
        logger.error(`Invalid command structure: ${className}`, error);
        errors.push({ name: className, error });
        errorCount++;
        continue;
      }

      if (typeof command.execute !== 'function') {
        const error = new Error(`Command ${command.name} has invalid or missing execute method`);
        logger.error(`Invalid command structure: ${command.name}`, error);
        errors.push({ name: command.name, error });
        errorCount++;
        continue;
      }

      if (typeof command.build !== 'function') {
        const error = new Error(`Command ${command.name} has invalid or missing build method`);
        logger.error(`Invalid command structure: ${command.name}`, error);
        errors.push({ name: command.name, error });
        errorCount++;
        continue;
      }

      // Check for duplicate command names
      if (commands.has(command.name)) {
        const error = new Error(`Duplicate command name: ${command.name}`);
        logger.error(`Duplicate command: ${command.name}`, error);
        errors.push({ name: command.name, error });
        errorCount++;
        continue;
      }

      commands.set(command.name, command);
      logger.info(`Loaded command: ${command.name} (${command.category || 'general'})`);
      loadedCount++;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const className = CommandClass?.name ?? 'Unknown';
      logger.error(`Failed to load command: ${className}`, err);
      errors.push({ name: className, error: err });
      errorCount++;
    }
  }

  // Load voice commands
  try {
    loadVoiceCommands();
    // Add voice commands to main commands collection
    for (const [name, command] of voiceCommands) {
      if (commands.has(name)) {
        logger.warn(`Skipping duplicate voice command: ${name}`);
        continue;
      }
      commands.set(name, command);
      loadedCount++;
    }
  } catch (error) {
    logger.error('Failed to load voice commands', error instanceof Error ? error : undefined);
    errorCount++;
  }

  // Load owner commands
  try {
    loadOwnerCommands();
    // Add owner commands to main commands collection
    for (const [name, command] of ownerCommands) {
      if (commands.has(name)) {
        logger.warn(`Skipping duplicate owner command: ${name}`);
        continue;
      }
      commands.set(name, command);
      loadedCount++;
    }
  } catch (error) {
    logger.error('Failed to load owner commands', error instanceof Error ? error : undefined);
    errorCount++;
  }

  logger.info(`✅ Commands loaded: ${loadedCount} successful, ${errorCount} failed (Total: ${commands.size})`);
  
  if (errors.length > 0 && process.env.NODE_ENV === 'development') {
    logger.warn('Command loading errors:', errors);
  }
}

export function getCommands(): Collection<string, Command> {
  return commands;
}

