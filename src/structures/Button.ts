import { ButtonInteraction } from 'discord.js';
import { BotClient } from '../client';

export interface ButtonOptions {
  id: string;
  customId?: string;
}

export abstract class Button {
  public readonly id: string;
  public readonly customId: string;

  constructor(
    public readonly client: BotClient,
    public readonly options: ButtonOptions
  ) {
    this.id = options.id;
    this.customId = options.customId || options.id;
  }

  abstract execute(interaction: ButtonInteraction): Promise<void> | void;
}

