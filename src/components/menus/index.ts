import { Collection } from 'discord.js';
import { Menu } from '../../structures/Menu';
import { logger } from '../../utils/logger';
import ActivitySelectMenu from './activity-select';
import VoiceDisconnectMenu from './voice-disconnect-menu';

export const menus = new Collection<string, Menu>();

export function loadMenus(client: any): void {
  const menuClasses = [ActivitySelectMenu, VoiceDisconnectMenu];

  for (const MenuClass of menuClasses) {
    const menu = new MenuClass(client);
    menus.set(menu.customId, menu);
    logger.info(`Loaded menu: ${menu.customId}`);
  }
}

export function getMenus(): Collection<string, Menu> {
  return menus;
}

