import { env } from './env.config';

export const botConfig = {
  // Bot Information
  name: 'Discord Bot',
  version: '1.0.0',
  prefix: process.env.PREFIX || '!',

  // Client Options
  intents: [
    'Guilds',
    'GuildMembers',
    'GuildMessages',
    'MessageContent',
    'GuildVoiceStates',
  ] as const,

  // Command Settings
  commands: {
    cooldown: 3000, // 3 seconds default cooldown
    deleteAfterReply: false,
  },

  // Colors
  colors: {
    main: '#7289DA',
    success: '#43B581',
    error: '#F04747',
    warning: '#FAA61A',
    red: '#F04747',
  },

  // Links
  links: {
    supportServer: process.env.SUPPORT_SERVER_URL || 'https://discord.gg/your-server',
    invite: process.env.INVITE_URL || '',
  },

  // Environment
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
} as const;

