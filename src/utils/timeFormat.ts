/**
 * Time formatting utilities
 */

export class TimeFormat {
  /**
   * Convert milliseconds to human-readable format
   * @param ms - Milliseconds
   * @returns Human-readable string (e.g., "2h 30m 15s")
   */
  static toHumanize(ms: number): string {
    if (ms < 0) ms = -ms;
    const time = {
      day: Math.floor(ms / 86400000),
      hour: Math.floor(ms / 3600000) % 24,
      minute: Math.floor(ms / 60000) % 60,
      second: Math.floor(ms / 1000) % 60,
    };

    const parts: string[] = [];
    if (time.day > 0) parts.push(`${time.day}d`);
    if (time.hour > 0) parts.push(`${time.hour}h`);
    if (time.minute > 0) parts.push(`${time.minute}m`);
    if (time.second > 0 || parts.length === 0) parts.push(`${time.second}s`);

    return parts.join(' ');
  }

  /**
   * Format bytes to human-readable format
   * @param bytes - Bytes to format
   * @returns Formatted string (e.g., "1.5 MB")
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Convert seconds to human-readable format
   * @param seconds - Seconds to format
   * @returns Human-readable string
   */
  static toHumanizeSeconds(seconds: number): string {
    return this.toHumanize(seconds * 1000);
  }
}

export function formatBytes(bytes: number): string {
  return TimeFormat.formatBytes(bytes);
}

