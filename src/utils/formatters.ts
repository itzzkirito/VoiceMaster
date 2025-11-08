export const formatters = {
  /**
   * Format duration in milliseconds to human-readable string
   */
  duration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  },

  /**
   * Format bytes to human-readable string
   */
  bytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  },

  /**
   * Truncate string to specified length
   */
  truncate(str: string, length: number): string {
    if (str.length <= length) return str;
    return str.substring(0, length - 3) + '...';
  },

  /**
   * Format number with commas
   */
  number(num: number): string {
    return num.toLocaleString();
  },

  /**
   * Escape markdown special characters
   */
  escapeMarkdown(text: string): string {
    return text.replace(/([\\*_`|\[\]()])/g, '\\$1');
  },
};

