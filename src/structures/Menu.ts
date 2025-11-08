import {
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
  ChannelSelectMenuInteraction,
} from 'discord.js';
import { BotClient } from '../client';

export interface MenuOptions {
  id: string;
  customId?: string;
}

export abstract class Menu {
  public readonly id: string;
  public readonly customId: string;

  constructor(
    public readonly client: BotClient,
    public readonly options: MenuOptions
  ) {
    this.id = options.id;
    this.customId = options.customId || options.id;
  }

  abstract execute(
    interaction:
      | StringSelectMenuInteraction
      | UserSelectMenuInteraction
      | ChannelSelectMenuInteraction
  ): Promise<void> | void;
}

