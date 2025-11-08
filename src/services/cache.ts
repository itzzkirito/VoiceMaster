import Redis from 'ioredis';
import { env } from '../config/env.config';
import { logger } from '../utils/logger';

let redis: Redis | null = null;

/**
 * Get Redis client instance
 * @returns Redis client or null if not available
 */
export const getCache = (): Redis | null => {
  if (redis) {
    return redis;
  }

  if (!env.REDIS_URL || env.REDIS_URL.trim() === '') {
    return null;
  }

  try {
    redis = new Redis(env.REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redis.on('error', (error) => {
      logger.error('Redis error', error);
      // Don't set redis to null here - let retry strategy handle reconnection
    });

    redis.on('connect', () => {
      logger.info('Connected to Redis');
    });

    redis.on('ready', () => {
      logger.info('Redis client ready');
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  } catch (error) {
    logger.error('Failed to initialize Redis client', error instanceof Error ? error : undefined);
    redis = null;
    return null;
  }

  return redis;
};

// In-memory cache fallback with size limits
class MemoryCache {
  private cache: Map<string, { value: unknown; expires: number }> = new Map();
  private readonly MAX_SIZE = 10000; // Maximum number of entries
  private readonly CLEANUP_INTERVAL_MS = 300000; // Clean up every 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Clean up expired entries and enforce size limit
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // Remove expired entries
    for (const [key, item] of this.cache.entries()) {
      if (item.expires <= now) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    // If still over limit, remove oldest entries (LRU-like behavior)
    if (this.cache.size > this.MAX_SIZE) {
      const entries = Array.from(this.cache.entries());
      // Sort by expiry time (oldest first)
      entries.sort((a, b) => a[1].expires - b[1].expires);
      
      const toRemove = this.cache.size - this.MAX_SIZE;
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  set(key: string, value: unknown, ttl: number = 3600): void {
    // Clean up before adding if at limit
    if (this.cache.size >= this.MAX_SIZE && !this.cache.has(key)) {
      this.cleanupExpired();
    }

    const expires = Date.now() + ttl * 1000;
    this.cache.set(key, { value, expires });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_SIZE,
    };
  }

  /**
   * Destroy the cache and stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

const memoryCache = new MemoryCache();

export const cache = {
  async set(key: string, value: unknown, ttl: number = 3600): Promise<void> {
    try {
      const redis = getCache();
      if (redis) {
        await redis.setex(key, ttl, JSON.stringify(value));
        return;
      }
    } catch (error) {
      logger.error('Error setting cache in Redis', error instanceof Error ? error : undefined);
      // Fallback to memory cache if Redis fails
    }
    
    // Always fallback to memory cache if Redis is not available or fails
    memoryCache.set(key, value, ttl);
  },

  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getCache();
      if (redis) {
        const value = await redis.get(key);
        if (value) {
          try {
            return JSON.parse(value) as T;
          } catch (parseError) {
            logger.error('Error parsing cached value', parseError instanceof Error ? parseError : undefined);
            // Delete corrupted cache entry
            await redis.del(key).catch(() => {});
            return null;
          }
        }
        return null;
      }
    } catch (error) {
      logger.error('Error getting cache from Redis', error instanceof Error ? error : undefined);
      // Fallback to memory cache if Redis fails
    }
    
    // Always fallback to memory cache if Redis is not available or fails
    return memoryCache.get<T>(key);
  },

  async delete(key: string): Promise<void> {
    try {
      const redis = getCache();
      if (redis) {
        await redis.del(key);
      }
    } catch (error) {
      logger.error('Error deleting cache from Redis', error instanceof Error ? error : undefined);
    }
    
    // Always delete from memory cache as well (for consistency)
    memoryCache.delete(key);
  },

  async clear(): Promise<void> {
    try {
      const redis = getCache();
      if (redis) {
        await redis.flushdb();
      }
    } catch (error) {
      logger.error('Error clearing Redis cache', error instanceof Error ? error : undefined);
    }
    
    // Always clear memory cache as well
    memoryCache.clear();
  },

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ type: 'redis' | 'memory'; stats: unknown }> {
    const redis = getCache();
    if (redis) {
      try {
        const info = await redis.info('stats');
        return { type: 'redis', stats: info };
      } catch (error) {
        logger.error('Error getting Redis stats', error instanceof Error ? error : undefined);
        return { type: 'memory', stats: memoryCache.getStats() };
      }
    }
    return { type: 'memory', stats: memoryCache.getStats() };
  },

  /**
   * Close Redis connection gracefully
   */
  async disconnect(): Promise<void> {
    if (redis) {
      try {
        await redis.quit();
        logger.info('Redis connection closed gracefully');
      } catch (error) {
        logger.error('Error closing Redis connection', error instanceof Error ? error : undefined);
      } finally {
        redis = null;
      }
    }
    memoryCache.destroy();
  },
};

