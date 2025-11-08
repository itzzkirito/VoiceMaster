import { Collection } from 'discord.js';

interface CooldownData {
  userId: string;
  commandName: string;
  expiresAt: number;
}

class CooldownManager {
  private cooldowns: Collection<string, CooldownData> = new Collection();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60000; // Clean up every minute

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * Start periodic cleanup of expired cooldowns
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCooldowns();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Clean up expired cooldowns
   */
  private cleanupExpiredCooldowns(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, cooldown] of this.cooldowns.entries()) {
      if (cooldown.expiresAt <= now) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cooldowns.delete(key);
    }

    if (keysToDelete.length > 0) {
      // Only log if there were items cleaned up (reduce logging noise)
      // Could add logger.debug here if needed
    }
  }

  /**
   * Check if a user is on cooldown for a command
   * @param userId - The user's ID
   * @param commandName - The command name
   * @param cooldownMs - Cooldown duration in milliseconds
   * @returns Remaining cooldown in milliseconds, or 0 if not on cooldown
   */
  checkCooldown(userId: string, commandName: string, cooldownMs: number): number {
    const key = `${userId}-${commandName}`;
    const cooldown = this.cooldowns.get(key);
    const now = Date.now();

    if (!cooldown) {
      // Set new cooldown
      this.cooldowns.set(key, {
        userId,
        commandName,
        expiresAt: now + cooldownMs,
      });
      return 0;
    }

    const remaining = cooldown.expiresAt - now;
    
    if (remaining <= 0) {
      // Cooldown expired, remove and set new one
      this.cooldowns.set(key, {
        userId,
        commandName,
        expiresAt: now + cooldownMs,
      });
      return 0;
    }

    return remaining;
  }

  /**
   * Format cooldown time in a human-readable format
   * @param ms - Milliseconds
   * @returns Formatted string
   */
  formatCooldown(ms: number): string {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return remainingSeconds > 0
        ? `${minutes} minute${minutes !== 1 ? 's' : ''} and ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`
        : `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`
      : `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  /**
   * Clear cooldown for a user and command
   * @param userId - The user's ID
   * @param commandName - The command name
   */
  clearCooldown(userId: string, commandName: string): void {
    const key = `${userId}-${commandName}`;
    this.cooldowns.delete(key);
  }

  /**
   * Clear all cooldowns
   */
  clearAll(): void {
    this.cooldowns.clear();
  }

  /**
   * Destroy the cooldown manager and stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cooldowns.clear();
  }

  /**
   * Get statistics about cooldowns
   */
  getStats(): { total: number; expired: number } {
    const now = Date.now();
    let expired = 0;

    for (const cooldown of this.cooldowns.values()) {
      if (cooldown.expiresAt <= now) {
        expired++;
      }
    }

    return {
      total: this.cooldowns.size,
      expired,
    };
  }
}

export const cooldownManager = new CooldownManager();

