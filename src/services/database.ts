import { PrismaClient } from '@prisma/client';
import mongoose, { Connection } from 'mongoose';
import { env } from '../config/env.config';
import { logger } from '../utils/logger';

// Prisma Client (for PostgreSQL)
let prisma: PrismaClient | null = null;

// Mongoose Connection (for MongoDB)
let mongooseConnection: Connection | null = null;

/**
 * Get Prisma Client (PostgreSQL)
 */
export const getPrisma = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Handle connection errors
    prisma.$on('error' as never, (e: unknown) => {
      logger.error('Prisma database error', e instanceof Error ? e : undefined);
    });
  }

  return prisma;
};

/**
 * Connect to MongoDB using Mongoose
 */
export const connectMongoDB = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState === 1) {
      logger.info('MongoDB already connected');
      return;
    }

    const uri = env.MONGODB_URI;
    
    if (!uri || uri.trim() === '') {
      logger.warn('MONGODB_URI is not set, skipping MongoDB connection');
      logger.warn('Bot will continue to work, but database features will not be available');
      return;
    }

    // Disable mongoose buffering BEFORE connecting to prevent operation buffering
    // This ensures operations fail immediately if connection is not available
    mongoose.set('bufferCommands', false);
    
    logger.info('Attempting to connect to MongoDB...');
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      // Connection pool optimization
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2, // Minimum number of connections in the pool
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      // Additional optimizations
      retryWrites: true,
      w: 'majority',
      // Performance optimizations
      autoIndex: process.env.NODE_ENV !== 'production', // Only create indexes in development
      autoCreate: true, // Automatically create collections
    });

    mongooseConnection = mongoose.connection;

    // Set up event handlers (only once)
    if (!mongooseConnection.listeners('connected').length) {
      mongooseConnection.on('connected', () => {
        logger.info('Connected to MongoDB');
      });

      mongooseConnection.on('error', (error) => {
        logger.error('MongoDB connection error', error);
      });

      mongooseConnection.on('disconnected', () => {
        logger.warn('Disconnected from MongoDB');
      });

      mongooseConnection.on('reconnected', () => {
        logger.info('Reconnected to MongoDB');
      });
    }

    logger.info(`Connected to MongoDB: ${mongooseConnection.name}`);
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error instanceof Error ? error : undefined);
    throw error;
  }
};

/**
 * Disconnect from MongoDB
 */
export const disconnectMongoDB = async (): Promise<void> => {
  try {
    if (mongooseConnection && mongooseConnection.readyState !== 0) {
      await mongoose.disconnect();
      mongooseConnection = null;
      logger.info('Disconnected from MongoDB');
    }
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', error instanceof Error ? error : undefined);
  }
};

/**
 * Get Mongoose connection
 */
export const getMongoConnection = (): Connection | null => {
  return mongooseConnection || (mongoose.connection.readyState === 1 ? mongoose.connection : null);
};

/**
 * Check if database is connected
 */
export const isDatabaseConnected = (): boolean => {
  if (env.DATABASE_TYPE === 'mongodb') {
    return mongoose.connection.readyState === 1;
  }
  // For PostgreSQL, Prisma handles connection automatically
  return prisma !== null;
};

/**
 * Wait for database connection with timeout
 */
export const waitForDatabaseConnection = async (timeoutMs: number = 30000): Promise<boolean> => {
  if (env.DATABASE_TYPE === 'mongodb') {
    if (mongoose.connection.readyState === 1) {
      return true;
    }

    // Wait for connection with timeout
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      // Set up one-time connection listener
      const onConnected = () => {
        cleanup();
        resolve(true);
      };
      
      const onError = () => {
        cleanup();
        resolve(false);
      };
      
      const cleanup = () => {
        clearInterval(checkInterval);
        mongooseConnection?.removeListener('connected', onConnected);
        mongooseConnection?.removeListener('error', onError);
      };
      
      mongooseConnection?.once('connected', onConnected);
      mongooseConnection?.once('error', onError);
      
      const checkInterval = setInterval(() => {
        if (mongoose.connection.readyState === 1) {
          cleanup();
          resolve(true);
        } else if (Date.now() - startTime > timeoutMs) {
          cleanup();
          resolve(false);
        }
      }, 100);
    });
  }
  
  // For PostgreSQL, Prisma connects lazily
  return prisma !== null;
};

/**
 * Initialize database connection based on DATABASE_TYPE
 */
export const connectDatabase = async (): Promise<void> => {
  if (env.DATABASE_TYPE === 'mongodb') {
    await connectMongoDB();
  } else if (env.DATABASE_TYPE === 'postgresql') {
    // Prisma connects lazily, so we just ensure it's initialized
    getPrisma();
    logger.info('Prisma client initialized (PostgreSQL)');
  } else {
    logger.warn(`Unknown database type: ${env.DATABASE_TYPE}. Defaulting to MongoDB.`);
    await connectMongoDB();
  }
};

/**
 * Disconnect from database
 */
export const disconnectDatabase = async (): Promise<void> => {
  if (env.DATABASE_TYPE === 'mongodb') {
    await disconnectMongoDB();
  } else if (env.DATABASE_TYPE === 'postgresql') {
    if (prisma) {
      await prisma.$disconnect();
      prisma = null;
      logger.info('Disconnected from PostgreSQL');
    }
  }
};

/**
 * Legacy function for backward compatibility
 */
export const getDatabase = (): PrismaClient | Connection => {
  if (env.DATABASE_TYPE === 'mongodb') {
    const conn = getMongoConnection();
    if (!conn) {
      throw new Error('MongoDB not connected. Call connectDatabase() first.');
    }
    return conn;
  }
  return getPrisma();
};
