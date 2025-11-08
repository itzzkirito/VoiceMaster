import { ClientEvents } from 'discord.js';

export interface EventOptions {
  name: keyof ClientEvents;
  once?: boolean;
}

export abstract class Event<T extends keyof ClientEvents = keyof ClientEvents> {
  public readonly name: T;
  public readonly once: boolean;

  constructor(public readonly options: EventOptions) {
    this.name = options.name as T;
    this.once = options.once ?? false;
  }

  abstract execute(...args: ClientEvents[T]): Promise<void> | void;
}

