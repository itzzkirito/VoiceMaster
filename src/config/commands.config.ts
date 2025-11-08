import { glob } from 'glob';
import { join } from 'path';

export const commandsConfig = {
  // Command directories
  directories: {
    general: join(__dirname, '../commands/general'),
    admin: join(__dirname, '../commands/admin'),
  },

  // Auto-load commands from directories
  async loadCommands(): Promise<string[]> {
    const commandFiles: string[] = [];
    const basePath = join(__dirname, '../commands');

    // Load from all subdirectories
    const patterns = [
      join(basePath, '**/*.ts').replace(/\\/g, '/'),
    ];

    for (const pattern of patterns) {
      const files = await glob(pattern, { ignore: ['**/index.ts'] });
      commandFiles.push(...files);
    }

    return commandFiles;
  },
} as const;

