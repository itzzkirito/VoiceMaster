# Environment Variables Configuration

This document describes all environment variables used in the bot.

## Required Environment Variables

### `DISCORD_TOKEN`
Your Discord bot token from the Discord Developer Portal.
- **How to get:** https://discord.com/developers/applications → Your Application → Bot → Reset Token
- **Example:** `DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GaBcDe.FgHiJkLmNoPqRsTuVwXyZaBcDeFgHiJkLmNoPqRsTuVw`

### `CLIENT_ID`
Your bot's application ID from the Discord Developer Portal.
- **How to get:** https://discord.com/developers/applications → Your Application → General Information → Application ID
- **Example:** `CLIENT_ID=123456789012345678`

### `OWNER_ID`
Your Discord User ID (for owner-only commands and no-prefix system).
- **How to get:**
  1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
  2. Right-click on your profile and select "Copy User ID"
- **Example:** `OWNER_ID=987654321098765432`

## Optional Environment Variables

### `GUILD_ID`
Guild ID for testing slash commands in a specific server.
- **How to get:** Right-click on server → Copy Server ID (requires Developer Mode)
- **Example:** `GUILD_ID=111222333444555666`

### `PREFIX`
Bot command prefix (default: `!`).
- **Example:** `PREFIX=!` or `PREFIX=?`

### `DEVELOPER_IDS`
Comma-separated list of developer user IDs (for owner commands access).
- **Example:** `DEVELOPER_IDS=123456789012345678,987654321098765432`

### Database Configuration

#### `DATABASE_TYPE`
Database type: `mongodb` or `postgresql` (default: `mongodb`).
- **Example:** `DATABASE_TYPE=mongodb`

#### `MONGODB_URI`
MongoDB connection string.
- **Local:** `MONGODB_URI=mongodb://localhost:27017/discord-bot`
- **Atlas:** `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/discord-bot`

#### `DATABASE_URL`
PostgreSQL connection string (if using PostgreSQL).
- **Example:** `DATABASE_URL=postgresql://user:password@localhost:5432/discord_bot`

### Redis Configuration

#### `REDIS_URL`
Redis connection string for caching (optional).
- **Local:** `REDIS_URL=redis://localhost:6379`
- **Cloud:** `REDIS_URL=redis://user:password@host:port`

### Spotify Configuration (Optional)

#### `SPOTIFY_CLIENT_ID`
Spotify API client ID.
- **Example:** `SPOTIFY_CLIENT_ID=your_spotify_client_id`

#### `SPOTIFY_CLIENT_SECRET`
Spotify API client secret.
- **Example:** `SPOTIFY_CLIENT_SECRET=your_spotify_client_secret`

### Webhook URLs (Optional)

These webhooks will receive logs about bot events. Create webhooks in your Discord server and paste the URLs.

- `NODE_ERROR_LOGS_HOOK` - Node.js errors
- `NODE_DESTROY_LOGS_HOOK` - Bot shutdown events
- `NODE_CONNECTION_HOOK` - Bot connection events
- `NODE_DISCONNECT_LOGS_HOOK` - Bot disconnection events
- `NODE_RECONNECT_LOGS_HOOK` - Bot reconnection events
- `ERROR_LOGS_HOOK` - General errors
- `GUILD_JOIN_LOGS_HOOK` - Guild join events
- `GUILD_LEAVE_LOGS_HOOK` - Guild leave events
- `COMMAND_LOGS_HOOK` - Command execution logs
- `RUNTIME_LOGS_HOOK` - Runtime logs
- `DM_LOGS_HOOK` - DM logs

**Example:**
```
ERROR_LOGS_HOOK=https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz
```

### Environment Settings

#### `NODE_ENV`
Environment mode: `development` or `production` (default: `development`).
- **Example:** `NODE_ENV=production`

#### `LOG_LEVEL`
Logging level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` (default: `info`).
- **Example:** `LOG_LEVEL=debug`

### Bot Links (Optional)

#### `SUPPORT_SERVER_URL`
Support server invite URL.
- **Example:** `SUPPORT_SERVER_URL=https://discord.gg/your-server`

#### `INVITE_URL`
Bot invite URL.
- **Example:** `INVITE_URL=https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot`

## Example .env File

```env
# Discord Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
PREFIX=!

# Owner Configuration
OWNER_ID=your_discord_user_id_here
DEVELOPER_IDS=123456789012345678,987654321098765432

# Database Configuration
DATABASE_TYPE=mongodb
MONGODB_URI=mongodb://localhost:27017/discord-bot

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=development
LOG_LEVEL=info

# Webhooks (Optional)
ERROR_LOGS_HOOK=
COMMAND_LOGS_HOOK=
```

## Important Notes

1. **Never commit your `.env` file** - It contains sensitive information
2. **Keep your bot token secret** - If exposed, reset it immediately
3. **OWNER_ID is required** for owner-only commands to work
4. **DEVELOPER_IDS** allows multiple users to access owner commands
5. All webhook URLs are optional but recommended for production

## Getting Your Discord User ID

1. Open Discord
2. Go to User Settings (gear icon)
3. Go to Advanced
4. Enable "Developer Mode"
5. Right-click on your profile (or any user)
6. Click "Copy User ID"
7. Paste it as `OWNER_ID` in your `.env` file

