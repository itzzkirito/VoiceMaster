# Discord Bot

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

A feature-rich, production-ready Discord bot built with TypeScript, Discord.js v14, and modern best practices. Designed for scalability, maintainability, and extensibility.

[Features](#-features) • [Installation](#-installation) • [Configuration](#-configuration) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Database Setup](#-database-setup)
- [Project Structure](#-project-structure)
- [Commands](#-commands)
- [Development](#-development)
- [Architecture](#-architecture)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🎯 Core Features

- **Modular Architecture**: Clean, organized codebase with separation of concerns
- **Type Safety**: Full TypeScript support with strict type checking
- **Command System**: Slash commands with prefix and mention support
- **Event Handling**: Comprehensive event system for Discord events
- **Database Support**: MongoDB (Mongoose) and PostgreSQL (Prisma) support
- **Caching Layer**: Redis caching with in-memory fallback
- **Error Handling**: Comprehensive error handling and logging
- **Webhook Logging**: Discord webhook integration for error tracking
- **Graceful Shutdown**: Proper cleanup on bot termination

### 🎤 Voice Master System

- **Auto-Room Creation**: Automatically creates private voice channels
- **Room Management**: Lock, unlock, hide, unhide voice channels
- **User Management**: Kick, move, pull users from voice channels
- **Channel Controls**: Set user limits, rename channels, allow/reject users
- **Interactive Controls**: Button-based interface for room management
- **Activity Integration**: Support for Discord activities (YouTube Together, Poker, etc.)

### 🛠️ Admin Commands

- **Member Management**: Ban, kick, and mute users
- **Permission System**: Role-based permission checks
- **Audit Logging**: Track admin actions

### 👑 Owner Commands

- **Bot Management**: Reload commands, shutdown, eval, exec
- **Blacklist System**: User and guild blacklisting
- **Command Blacklist**: Per-command blacklisting
- **No-Prefix System**: Allow users to use commands without prefix
- **Terminal Access**: Execute terminal commands
- **Uptime Monitoring**: Track bot uptime and performance

### 🎨 Interactive Components

- **Button Components**: 11 interactive button components
- **Menu Components**: Select menus for various actions
- **Rich Embeds**: Beautiful, customizable embed messages

### 📊 Monitoring & Logging

- **Structured Logging**: Pino-based logging with pretty printing
- **Webhook Integration**: Error logs, connection logs, command logs
- **Performance Monitoring**: Uptime tracking and performance metrics
- **Shard Support**: Multi-shard support with shard event monitoring

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher (or yarn/pnpm)
- **TypeScript** 5.3.3 or higher
- **MongoDB** 4.4+ (recommended) or **PostgreSQL** 12+ (optional)
- **Redis** 6.0+ (optional, for caching)
- **Discord Bot Token** ([Get one here](https://discord.com/developers/applications))

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd discord-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env  # If you have an example file
# Or create .env manually
```

See [Configuration](#-configuration) section for detailed environment variable documentation.

### 4. Build the Project

```bash
npm run build
```

### 5. Start the Bot

**Note:** Slash commands are automatically registered when the bot starts. You can also manually deploy commands using:

```bash
npm run deploy
```

Start the bot:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## 🚀 How the Bot Starts

The bot starts from the main entry point file: **`src/index.ts`**

### Startup Process

1. **Initialization** (`src/index.ts`)
   - Creates the `BotClient` instance
   - Loads all commands from `src/commands/`
   - Loads all buttons and menus from `src/components/`
   - Loads all events from `src/events/`
   - Connects to the database (MongoDB/PostgreSQL)
   - Sets up error handlers and graceful shutdown

2. **Command Loading**
   - Main commands from `src/commands/index.ts`
   - Voice commands from `src/commands/voice/`
   - Owner commands from `src/commands/owners/`
   - All commands are registered in the bot's command collection

3. **Event Registration**
   - Events are loaded and registered with Discord.js
   - Key events: `ready`, `interactionCreate`, `messageCreate`, etc.

4. **Database Connection**
   - Connects to MongoDB or PostgreSQL based on configuration
   - Initializes database models (User, Guild, Room, etc.)

5. **Bot Login**
   - Connects to Discord using the bot token
   - Triggers the `ready` event when connection is established

6. **Ready Event** (`src/events/client/ready.ts`)
   - Automatically registers slash commands with Discord API
   - Loads guild prefixes into cache
   - Initializes no-prefix users
   - Sets up command blacklist
   - Starts presence manager
   - Cleans up VoiceMaster rooms

### Entry Point

- **Source File**: `src/index.ts`
- **Compiled File**: `dist/index.js`
- **Development**: `npm run dev` (runs `src/index.ts` with ts-node)
- **Production**: `npm start` (runs `dist/index.js`)

### Startup Flow Diagram

```
src/index.ts
  ↓
1. Create BotClient
  ↓
2. Load Commands (loadCommands())
  ↓
3. Load Buttons & Menus
  ↓
4. Load Events (loadEvents())
  ↓
5. Connect Database (connectDatabase())
  ↓
6. Setup Error Handlers
  ↓
7. client.login() → Connect to Discord
  ↓
8. ready Event Fires
  ↓
9. Register Slash Commands (registerCommands())
  ↓
10. Initialize Features (prefixes, no-prefix users, etc.)
  ↓
11. Bot is Ready! ✅
```

## ⚙️ Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Your Discord bot token | `MTIzNDU2Nzg5MDEyMzQ1Njc4OQ...` |
| `CLIENT_ID` | Your bot's application ID | `123456789012345678` |
| `OWNER_ID` | Your Discord user ID | `987654321098765432` |

### Optional Environment Variables

#### Discord Configuration
```env
GUILD_ID=111222333444555666          # Guild ID for testing (optional)
PREFIX=!                             # Command prefix (default: !)
DEVELOPER_IDS=123456789,987654321    # Comma-separated developer IDs
```

#### Database Configuration
```env
DATABASE_TYPE=mongodb                # mongodb or postgresql (default: mongodb)
MONGODB_URI=mongodb://localhost:27017/discord-bot
# OR for PostgreSQL:
DATABASE_URL=postgresql://user:password@localhost:5432/discord_bot
```

#### Redis Configuration
```env
REDIS_URL=redis://localhost:6379     # Redis connection string (optional)
```

#### Spotify Configuration (Optional)
```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
```

#### Webhook URLs (Optional)
```env
NODE_ERROR_LOGS_HOOK=https://discord.com/api/webhooks/...
NODE_DESTROY_LOGS_HOOK=https://discord.com/api/webhooks/...
NODE_CONNECTION_HOOK=https://discord.com/api/webhooks/...
ERROR_LOGS_HOOK=https://discord.com/api/webhooks/...
GUILD_JOIN_LOGS_HOOK=https://discord.com/api/webhooks/...
GUILD_LEAVE_LOGS_HOOK=https://discord.com/api/webhooks/...
COMMAND_LOGS_HOOK=https://discord.com/api/webhooks/...
RUNTIME_LOGS_HOOK=https://discord.com/api/webhooks/...
DM_LOGS_HOOK=https://discord.com/api/webhooks/...
```

#### Environment Settings
```env
NODE_ENV=development                 # development or production
LOG_LEVEL=info                       # trace, debug, info, warn, error, fatal
```

#### Bot Links
```env
SUPPORT_SERVER_URL=https://discord.gg/your-server
INVITE_URL=https://discord.com/api/oauth2/authorize?client_id=...
```

### Getting Your Discord User ID

1. Open Discord
2. Go to **User Settings** → **Advanced**
3. Enable **Developer Mode**
4. Right-click on your profile
5. Select **Copy User ID**
6. Paste it as `OWNER_ID` in your `.env` file

For detailed environment variable documentation, see [ENV_SETUP.md](./ENV_SETUP.md).

## 🗄️ Database Setup

### MongoDB (Recommended)

#### Local Installation
1. Install MongoDB: https://www.mongodb.com/try/download/community
2. Start MongoDB service
3. Update `.env`:
   ```env
   DATABASE_TYPE=mongodb
   MONGODB_URI=mongodb://localhost:27017/discord-bot
   ```

#### MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Update `.env`:
   ```env
   DATABASE_TYPE=mongodb
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/discord-bot
   ```

### PostgreSQL (Optional)

1. Install PostgreSQL: https://www.postgresql.org/download/
2. Create database:
   ```sql
   CREATE DATABASE discord_bot;
   ```
3. Run Prisma migrations:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
4. Update `.env`:
   ```env
   DATABASE_TYPE=postgresql
   DATABASE_URL=postgresql://user:password@localhost:5432/discord_bot
   ```

### Database Models

The bot includes the following database models:

- **User**: User data (XP, level, coins, premium status, blacklist)
- **Guild**: Server settings (prefix, channels, custom settings, blacklist)
- **Room**: Voice room management (lock, hide, limit, owner)
- **VoiceCreator**: Voice master system configuration

Models support:
- Advanced database operations with validation
- Transaction support
- Relation validation
- Populated queries

For advanced database usage, see [docs/ADVANCED_DATABASE_USAGE.md](./docs/ADVANCED_DATABASE_USAGE.md).



## 🎮 Commands

### General Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/ping` | Check bot latency | `/ping` |
| `/help` | Display help information | `/help [command]` |
| `/info` | Display bot information | `/info` |

### Admin Commands

| Command | Description | Usage | Permissions |
|---------|-------------|-------|-------------|
| `/ban` | Ban a member | `/ban user:<user> reason:<reason>` | Ban Members |
| `/kick` | Kick a member | `/kick user:<user> reason:<reason>` | Kick Members |
| `/mute` | Mute a member | `/mute user:<user> duration:<duration> reason:<reason>` | Manage Roles |

### Voice Master Commands

| Command | Description | Usage | Permissions |
|---------|-------------|-------|-------------|
| `/voicemaster setup` | Setup VoiceMaster system | `/voicemaster setup` | Manage Channels |
| `/voicemaster reset` | Reset VoiceMaster system | `/voicemaster reset` | Manage Channels |

### Voice Management Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/vclock` | Lock your voice channel | `/vclock` |
| `/vcunlock` | Unlock your voice channel | `/vcunlock` |
| `/vchide` | Hide your voice channel | `/vchide` |
| `/vcunhide` | Unhide your voice channel | `/vcunhide` |
| `/vcrename` | Rename your voice channel | `/vcrename name:<name>` |
| `/vclimit` | Set user limit (0-99) | `/vclimit limit:<number>` |
| `/vckick` | Kick user from voice | `/vckick user:<user>` |
| `/vckickall` | Kick all users from voice | `/vckickall` |
| `/vcmove` | Move user to different channel | `/vcmove user:<user> channel:<channel>` |
| `/vcmoveall` | Move all users to different channel | `/vcmoveall channel:<channel>` |
| `/vcpull` | Pull user to your channel | `/vcpull user:<user>` |
| `/vcallow` | Allow user to join voice channel | `/vcallow user:<user>` |
| `/vcreject` | Reject user from voice channel | `/vcreject user:<user>` |

### Owner Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/eval` | Evaluate JavaScript code | `/eval code:<code>` |
| `/exec` | Execute shell command | `/exec command:<command>` |
| `/reload` | Reload a command | `/reload command:<command>` |
| `/shutdown` | Shutdown the bot | `/shutdown` |
| `/blacklist` | Blacklist a user or guild | `/blacklist type:<type> id:<id> reason:<reason>` |
| `/cmdblacklist` | Blacklist a command | `/cmdblacklist command:<command>` |
| `/noprefix` | Add/remove no-prefix user | `/noprefix user:<user>` |
| `/terminal` | Access terminal | `/terminal command:<command>` |
| `/uptimecheck` | Check bot uptime | `/uptimecheck` |

**Note:** All commands support slash commands, prefix commands, and mention commands (where applicable).

## 💻 Development

### Adding a New Command

1. Create a new file in `src/commands/<category>/<command>.ts`
2. Extend the `Command` class
3. Implement `build()` and `execute()` methods
4. Register it in `src/commands/index.ts`

**Example:**

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../structures/Command';

export default class MyCommand extends Command {
  constructor() {
    super({
      name: 'mycommand',
      description: 'My command description',
      category: 'general',
      cooldown: 3000,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName('mycommand')
      .setDescription('My command description');
  }

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply('Hello!');
  }
}
```

### Adding a New Event

1. Create a new file in `src/events/<category>/<event>.ts`
2. Extend the `Event` class
3. Implement the `execute()` method
4. Register it in `src/events/index.ts`

**Example:**

```typescript
import { Client } from 'discord.js';
import { Event } from '../../structures/Event';

export default class MessageCreateEvent extends Event {
  constructor() {
    super({
      name: 'messageCreate',
      once: false,
    });
  }

  async execute(message: Message) {
    // Your event logic here
  }
}
```

### Adding a New Component

#### Button Component

1. Create a new file in `src/components/buttons/<button>.ts`
2. Extend the `Button` class
3. Implement the `execute()` method
4. Register it in `src/components/buttons/index.ts`

#### Menu Component

1. Create a new file in `src/components/menus/<menu>.ts`
2. Extend the `Menu` class
3. Implement the `execute()` method
4. Register it in `src/components/menus/index.ts`

### Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Start the bot |
| `npm run dev` | Start with auto-reload (nodemon) |
| `npm run deploy` | Deploy slash commands |
| `npm test` | Run tests |
| `npm run lint` | Lint code |
| `npm run format` | Format code |

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with TypeScript rules
- **Prettier**: Code formatting
- **Jest**: Unit testing framework

### Best Practices

1. **Error Handling**: Always use try-catch blocks for async operations
2. **Type Safety**: Use TypeScript types and interfaces
3. **Logging**: Use the logger utility for all log messages
4. **Permissions**: Check permissions before executing commands
5. **Cooldowns**: Implement cooldowns for rate limiting
6. **Validation**: Validate user input before processing

## 🏗️ Architecture

### Command System

- **Slash Commands**: Primary command interface
- **Prefix Commands**: Legacy support with `!` prefix
- **Mention Commands**: Commands triggered by mentioning the bot
- **Cooldown System**: Rate limiting per command
- **Permission System**: Role-based permission checks
- **Error Handling**: Comprehensive error handling and user feedback

### Event System

- **Client Events**: Ready, interactionCreate, messageCreate, etc.
- **Guild Events**: guildCreate, guildDelete
- **Channel Events**: channelCreate, channelDelete, channelUpdate
- **Voice Events**: voiceStateUpdate (for voice master system)

### Database Layer

- **MongoDB**: Primary database (Mongoose ODM)
- **PostgreSQL**: Alternative database (Prisma ORM)
- **Caching**: Redis caching with in-memory fallback
- **Transactions**: Support for database transactions
- **Migrations**: Database migration support

### Service Layer

- **Database Service**: Database connection and management
- **Cache Service**: Redis caching with fallback
- **Webhook Service**: Discord webhook logging
- **API Client**: External API integration

### Component System

- **Buttons**: Interactive button components
- **Menus**: Select menu components
- **Embeds**: Rich embed messages

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add some amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Contribution Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass
- Follow semantic commit messages

### Code Style

- Use TypeScript for all new code
- Follow ESLint rules
- Use Prettier for formatting
- Add JSDoc comments for public APIs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Discord.js](https://discord.js.org/) - Discord API library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Mongoose](https://mongoosejs.com/) - MongoDB ODM
- [Prisma](https://www.prisma.io/) - PostgreSQL ORM
- [Pino](https://getpino.io/) - Logging library
- [ioredis](https://github.com/redis/ioredis) - Redis client

## 📚 Additional Documentation

- [Environment Setup Guide](./ENV_SETUP.md) - Detailed environment variable documentation
- [Advanced Database Usage](./docs/ADVANCED_DATABASE_USAGE.md) - Advanced database operations
- [Integration Summary](./INTEGRATION_SUMMARY.md) - Feature integration summary
- [Database Implementation](./docs/ADVANCED_DATABASE_IMPLEMENTATION.md) - Database implementation details

## 🔗 Useful Links

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord.js Documentation](https://discord.js.org/#/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)

## 📞 Support

For support, please open an issue on GitHub or join our Discord server.

---

<div align="center">

**Made with ❤️ by Kirito**

[⭐ Star this repo](https://github.com/your-username/discord-bot) • [🐛 Report Bug](https://github.com/your-username/discord-bot/issues) • [💡 Request Feature](https://github.com/your-username/discord-bot/issues)

</div>
