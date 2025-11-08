import { describe, it, expect } from '@jest/globals';
import { Event } from '../src/structures/Event';

// Example test for event structure
describe('Event', () => {
  it('should create an event with required properties', () => {
    class TestEvent extends Event {
      constructor() {
        super({
          name: 'ready',
          once: true,
        });
      }

      async execute() {
        // Test implementation
      }
    }

    const event = new TestEvent();
    expect(event.name).toBe('ready');
    expect(event.once).toBe(true);
  });
});

