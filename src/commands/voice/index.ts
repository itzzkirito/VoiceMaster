import { Collection } from 'discord.js';
import { Command } from '../../structures/Command';
import { logger } from '../../utils/logger';
import VcAllowCommand from './vcallow';
import VcRejectCommand from './vcreject';
import VcHideCommand from './vchide';
import VcUnhideCommand from './vcunhide';
import VcLockCommand from './vclock';
import VcUnlockCommand from './vcunlock';
import VcKickCommand from './vckick';
import VcKickAllCommand from './vckickall';
import VcLimitCommand from './vclimit';
import VcRenameCommand from './vcrename';
import VcMoveCommand from './vcmove';
import VcMoveAllCommand from './vcmoveall';
import VcPullCommand from './vcpull';

export const voiceCommands = new Collection<string, Command>();

export function loadVoiceCommands(): void {
  const commandClasses = [
    VcAllowCommand,
    VcRejectCommand,
    VcHideCommand,
    VcUnhideCommand,
    VcLockCommand,
    VcUnlockCommand,
    VcKickCommand,
    VcKickAllCommand,
    VcLimitCommand,
    VcRenameCommand,
    VcMoveCommand,
    VcMoveAllCommand,
    VcPullCommand,
  ];

  for (const CommandClass of commandClasses) {
    const command = new CommandClass();
    voiceCommands.set(command.name, command);
    logger.info(`Loaded voice command: ${command.name}`);
  }
}
