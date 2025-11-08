import { describe, it, expect } from '@jest/globals';
import { Command } from '../src/structures/Command';
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

// Example test for command structure
describe('Command', () => {
  it('should create a command with required properties', () => {
    class TestCommand extends Command {
      constructor() {
        super({
          name: 'test',
          description: 'Test command',
          category: 'general',
        });
      }

      build() {
        return new SlashCommandBuilder()
          .setName('test')
          .setDescription('Test command');
      }

      async execute(interaction: ChatInputCommandInteraction) {
        // Test implementation
      }
    }

    const command = new TestCommand();
    expect(command.name).toBe('test');
    expect(command.description).toBe('Test command');
    expect(command.category).toBe('general');
  });
});

