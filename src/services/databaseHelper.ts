import { User, IUser } from '../models/User';
import { Guild, IGuild } from '../models/Guild';
import { logger } from '../utils/logger';
import { cache } from './cache';
import type { Document } from 'mongoose';

/**
 * Database helper functions for common operations
 * 
 * For advanced create operations with joins, validation, and transactions,
 * see: src/services/advancedDatabase.ts
 */

// Type for plain user objects (from lean() queries or cache)
type UserPlain = Omit<IUser, keyof Document> & { _id: string };
type GuildPlain = Omit<IGuild, keyof Document> & { _id: string };

const CACHE_TTL = 300; // 5 minutes cache TTL
const USER_CACHE_PREFIX = 'user:';
const GUILD_CACHE_PREFIX = 'guild:';

/**
 * Get or create a user
 */
export async function getOrCreateUser(discordId: string, username: string, discriminator?: string): Promise<IUser> {
  try {
    const cacheKey = `${USER_CACHE_PREFIX}${discordId}`;
    
    // Try to get from cache first
    const cachedUser = await cache.get<UserPlain>(cacheKey);
    if (cachedUser) {
      // Update username if changed (async, don't wait)
      if (cachedUser.username !== username) {
        // Fire and forget - don't block on username update
        User.findOneAndUpdate(
          { discordId },
          { username, ...(discriminator && { discriminator }) },
          { new: true }
        )
          .then((updatedUser) => {
            if (updatedUser) {
              return cache.set(cacheKey, updatedUser.toObject() as UserPlain, CACHE_TTL);
            }
          })
          .catch((err) => {
            logger.debug('Failed to update username in background', err instanceof Error ? err : undefined);
          });
      }
      return cachedUser as unknown as IUser;
    }

    // Not in cache, query database
    let user = await User.findOne({ discordId }).lean<UserPlain>();
    
    if (!user) {
      // Create new user
      const newUser = new User({
        discordId,
        username,
        discriminator,
      });
      await newUser.save();
      logger.debug(`Created new user: ${username} (${discordId})`);
      
      const userObj = newUser.toObject() as UserPlain;
      // Cache in background
      cache.set(cacheKey, userObj, CACHE_TTL).catch(() => {});
      return userObj as unknown as IUser;
    }
    
    // Update username if changed
    if (user.username !== username) {
      const updatedUser = await User.findOneAndUpdate(
        { discordId },
        { username, ...(discriminator && { discriminator }) },
        { new: true }
      ).lean<UserPlain>();
      
      if (updatedUser) {
        // Cache in background
        cache.set(cacheKey, updatedUser, CACHE_TTL).catch(() => {});
        return updatedUser as unknown as IUser;
      }
    }
    
    // Cache the user in background
    cache.set(cacheKey, user, CACHE_TTL).catch(() => {});
    return user as unknown as IUser;
  } catch (error) {
    logger.error('Error in getOrCreateUser', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Get or create a guild
 */
export async function getOrCreateGuild(
  discordId: string,
  name: string,
  ownerId?: string
): Promise<IGuild> {
  try {
    const cacheKey = `${GUILD_CACHE_PREFIX}${discordId}`;
    
    // Try to get from cache first
    const cachedGuild = await cache.get<GuildPlain>(cacheKey);
    if (cachedGuild) {
      // Update name if changed (async, don't wait)
      if (cachedGuild.name !== name) {
        // Fire and forget - don't block on name update
        Guild.findOneAndUpdate(
          { discordId },
          { name, ...(ownerId && { ownerId }) },
          { new: true }
        )
          .then((updatedGuild) => {
            if (updatedGuild) {
              return cache.set(cacheKey, updatedGuild.toObject() as GuildPlain, CACHE_TTL);
            }
          })
          .catch((err) => {
            logger.debug('Failed to update guild name in background', err instanceof Error ? err : undefined);
          });
      }
      return cachedGuild as unknown as IGuild;
    }

    // Not in cache, query database
    let guild = await Guild.findOne({ discordId }).lean<GuildPlain>();
    
    if (!guild) {
      // Create new guild
      const newGuild = new Guild({
        discordId,
        name,
        ownerId,
      });
      await newGuild.save();
      logger.debug(`Created new guild: ${name} (${discordId})`);
      
      const guildObj = newGuild.toObject() as GuildPlain;
      // Cache in background
      cache.set(cacheKey, guildObj, CACHE_TTL).catch(() => {});
      return guildObj as unknown as IGuild;
    }
    
    // Update name if changed
    if (guild.name !== name) {
      const updatedGuild = await Guild.findOneAndUpdate(
        { discordId },
        { name, ...(ownerId && { ownerId }) },
        { new: true }
      ).lean<GuildPlain>();
      
      if (updatedGuild) {
        // Cache in background
        cache.set(cacheKey, updatedGuild, CACHE_TTL).catch(() => {});
        return updatedGuild as unknown as IGuild;
      }
    }
    
    // Cache the guild in background
    cache.set(cacheKey, guild, CACHE_TTL).catch(() => {});
    return guild as unknown as IGuild;
  } catch (error) {
    logger.error('Error in getOrCreateGuild', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Update user XP and level
 */
export async function addUserXP(discordId: string, xp: number): Promise<IUser | null> {
  try {
    const cacheKey = `${USER_CACHE_PREFIX}${discordId}`;
    
    // Use findOneAndUpdate for atomic operation and better performance
    const user = await User.findOneAndUpdate(
      { discordId },
      [
        {
          $set: {
            xp: { $add: [{ $ifNull: ['$xp', 0] }, xp] },
          },
        },
      ],
      { new: true }
    ).lean<UserPlain>();
    
    if (!user) return null;

    // Calculate level (simple formula: level = sqrt(xp / 100))
    const newLevel = Math.floor(Math.sqrt(user.xp / 100)) + 1;
    const currentLevel = user.level || 1;
    
    if (newLevel > currentLevel) {
      // Update level if it increased
      const updatedUser = await User.findOneAndUpdate(
        { discordId },
        { level: newLevel },
        { new: true }
      ).lean<UserPlain>();
      
      if (updatedUser) {
        // Cache in background
        cache.set(cacheKey, updatedUser, CACHE_TTL).catch(() => {});
        return updatedUser as unknown as IUser;
      }
    }
    
    // Cache in background
    cache.set(cacheKey, user, CACHE_TTL).catch(() => {});
    return user as unknown as IUser;
  } catch (error) {
    logger.error('Error in addUserXP', error instanceof Error ? error : undefined);
    return null;
  }
}

/**
 * Get guild settings
 */
export async function getGuildSettings(discordId: string): Promise<IGuild | null> {
  try {
    const cacheKey = `${GUILD_CACHE_PREFIX}${discordId}`;
    
    // Try cache first
    const cachedGuild = await cache.get<GuildPlain>(cacheKey);
    if (cachedGuild) {
      return cachedGuild as unknown as IGuild;
    }

    // Query database
    const guild = await Guild.findOne({ discordId }).lean<GuildPlain>();
    if (guild) {
      await cache.set(cacheKey, guild, CACHE_TTL);
      return guild as unknown as IGuild;
    }
    
    return null;
  } catch (error) {
    logger.error('Error in getGuildSettings', error instanceof Error ? error : undefined);
    return null;
  }
}

/**
 * Update guild settings
 */
export async function updateGuildSettings(
  discordId: string,
  settings: Partial<IGuild>
): Promise<IGuild | null> {
  try {
    const cacheKey = `${GUILD_CACHE_PREFIX}${discordId}`;
    
    const guild = await Guild.findOneAndUpdate(
      { discordId },
      { $set: settings },
      { new: true, upsert: true }
    ).lean<GuildPlain>();
    
    if (guild) {
      // Update cache
      await cache.set(cacheKey, guild, CACHE_TTL);
      return guild as unknown as IGuild;
    }
    
    return null;
  } catch (error) {
    logger.error('Error in updateGuildSettings', error instanceof Error ? error : undefined);
    return null;
  }
}

/**
 * Invalidate cache for a user
 */
export async function invalidateUserCache(discordId: string): Promise<void> {
  const cacheKey = `${USER_CACHE_PREFIX}${discordId}`;
  await cache.delete(cacheKey);
}

/**
 * Invalidate cache for a guild
 */
export async function invalidateGuildCache(discordId: string): Promise<void> {
  const cacheKey = `${GUILD_CACHE_PREFIX}${discordId}`;
  await cache.delete(cacheKey);
}

