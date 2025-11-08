import { Collection } from 'discord.js';
import { Command } from '../../structures/Command';
import { logger } from '../../utils/logger';
import EvalCommand from './eval';
import ReloadCommand from './reload';
import ShutdownCommand from './shutdown';
import ExecCommand from './exec';
import NoPrefixCommand from './noprefix';
import BlacklistCommand from './blacklist';
import CmdBlacklistCommand from './cmdblacklist';
import UptimeCheckCommand from './uptimecheck';
import TerminalCommand from './terminal';

export const ownerCommands = new Collection<string, Command>();

export function loadOwnerCommands(): void {
  const commandClasses = [
    EvalCommand,
    ReloadCommand,
    ShutdownCommand,
    ExecCommand,
    NoPrefixCommand,
    BlacklistCommand,
    CmdBlacklistCommand,
    UptimeCheckCommand,
    TerminalCommand,
  ];

  for (const CommandClass of commandClasses) {
    const command = new CommandClass();
    ownerCommands.set(command.name, command);
    logger.info(`Loaded owner command: ${command.name}`);
  }
}

