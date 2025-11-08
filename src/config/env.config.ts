import dotenv from 'dotenv';

dotenv.config();

export const env = {
  // Discord
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || '',
  CLIENT_ID: process.env.CLIENT_ID || '',
  GUILD_ID: process.env.GUILD_ID || '',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  DATABASE_TYPE: (process.env.DATABASE_TYPE || 'mongodb').toLowerCase() as 'mongodb' | 'postgresql',
  MONGODB_URI: process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/discord-bot',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // Spotify
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || '',
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || '',

  // Webhooks
  NODE_ERROR_LOGS_HOOK: process.env.NODE_ERROR_LOGS_HOOK || '',
  NODE_DESTROY_LOGS_HOOK: process.env.NODE_DESTROY_LOGS_HOOK || '',
  NODE_CONNECTION_HOOK: process.env.NODE_CONNECTION_HOOK || '',
  NODE_DISCONNECT_LOGS_HOOK: process.env.NODE_DISCONNECT_LOGS_HOOK || '',
  NODE_RECONNECT_LOGS_HOOK: process.env.NODE_RECONNECT_LOGS_HOOK || '',
  ERROR_LOGS_HOOK: process.env.ERROR_LOGS_HOOK || '',
  GUILD_JOIN_LOGS_HOOK: process.env.GUILD_JOIN_LOGS_HOOK || '',
  COMMAND_LOGS_HOOK: process.env.COMMAND_LOGS_HOOK || '',
  GUILD_LEAVE_LOGS_HOOK: process.env.GUILD_LEAVE_LOGS_HOOK || '',
  RUNTIME_LOGS_HOOK: process.env.RUNTIME_LOGS_HOOK || '',
  DM_LOGS_HOOK: process.env.DM_LOGS_HOOK || '',

  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Developer
  OWNER_ID: process.env.OWNER_ID?.trim() || '',
  DEVELOPER_IDS: process.env.DEVELOPER_IDS?.split(',').map(id => id.trim()).filter(id => id.length > 0) || [],
} as const;

// Validate required environment variables
const requiredEnvVars = ['DISCORD_TOKEN', 'CLIENT_ID'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

