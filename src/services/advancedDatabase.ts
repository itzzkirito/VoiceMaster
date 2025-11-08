import mongoose, { ClientSession } from 'mongoose';
import { User, IUser } from '../models/User';
import { Guild, IGuild } from '../models/Guild';
import { Room, IRoom } from '../models/Room';
import { logger } from '../utils/logger';

/**
 * Advanced Database Service
 * Provides professional create operations with joins, validation, and transactions
 */

// Type definitions for populated/joined data
export interface PopulatedRoom extends Omit<IRoom, 'guildId' | 'ownerId'> {
  guild: IGuild | null;
  owner: IUser | null;
  guildId: string;
  ownerId: string;
}

export interface PopulatedGuild extends Omit<IGuild, 'ownerId'> {
  owner: IUser | null;
  ownerId?: string;
}

export interface CreateRoomOptions {
  /**
   * Whether to validate that related entities (Guild, User) exist
   * @default true
   */
  validateRelations?: boolean;
  
  /**
   * Whether to populate/join related data in the response
   * @default false
   */
  populate?: boolean;
  
  /**
   * Whether to use a database transaction
   * @default false
   */
  useTransaction?: boolean;
  
  /**
   * Custom session for transaction (if useTransaction is true)
   */
  session?: ClientSession;
}

export interface CreateGuildOptions {
  /**
   * Whether to validate that owner (User) exists
   * @default true
   */
  validateRelations?: boolean;
  
  /**
   * Whether to populate/join owner data in the response
   * @default false
   */
  populate?: boolean;
  
  /**
   * Whether to use a database transaction
   * @default false
   */
  useTransaction?: boolean;
  
  /**
   * Custom session for transaction (if useTransaction is true)
   */
  session?: ClientSession;
}

/**
 * Advanced createRoom with validation, joins, and transaction support
 */
export async function createRoomAdvanced(
  data: {
    channelId: string;
    guildId: string;
    ownerId: string;
    locked?: boolean;
    hidden?: boolean;
    limit?: number;
  },
  options: CreateRoomOptions = {}
): Promise<IRoom | PopulatedRoom> {
  const {
    validateRelations = true,
    populate = false,
    useTransaction = false,
    session,
  } = options;

  // Start transaction if requested
  const shouldStartTransaction = useTransaction && !session;
  const dbSession = session || (shouldStartTransaction ? await mongoose.startSession() : undefined);

  try {
    if (dbSession && shouldStartTransaction) {
      dbSession.startTransaction();
    }

    // Validate related entities exist if requested
    if (validateRelations) {
      const [guild, owner] = await Promise.all([
        Guild.findOne({ discordId: data.guildId }).session(dbSession || null),
        User.findOne({ discordId: data.ownerId }).session(dbSession || null),
      ]);

      if (!guild) {
        throw new Error(`Guild with discordId ${data.guildId} not found`);
      }

      if (!owner) {
        throw new Error(`User with discordId ${data.ownerId} not found`);
      }

      logger.debug(`Validated relations for room creation: guild=${data.guildId}, owner=${data.ownerId}`);
    }

    // Check if room already exists
    const existingRoom = await Room.findOne({ channelId: data.channelId })
      .session(dbSession || null);
    
    if (existingRoom) {
      throw new Error(`Room with channelId ${data.channelId} already exists`);
    }

    // Create the room
    const room = await Room.create([data], { session: dbSession || undefined });
    const createdRoom = room[0];

    // Commit transaction if we started it
    if (dbSession && shouldStartTransaction) {
      await dbSession.commitTransaction();
    }

    // Populate related data if requested
    if (populate) {
      const populatedRoom = await Room.findById(createdRoom._id)
        .lean()
        .then(async (roomDoc) => {
          if (!roomDoc) return null;

          // Fetch related data using aggregation for better performance
          const [guild, owner] = await Promise.all([
            Guild.findOne({ discordId: roomDoc.guildId }).lean(),
            User.findOne({ discordId: roomDoc.ownerId }).lean(),
          ]);

          return {
            ...roomDoc,
            guild: guild || null,
            owner: owner || null,
          } as PopulatedRoom;
        });

      if (populatedRoom) {
        logger.debug(`Created room ${data.channelId} with populated relations`);
        return populatedRoom;
      }
    }

    logger.debug(`Created room ${data.channelId}`);
    return createdRoom;
  } catch (error) {
    // Rollback transaction on error
    if (dbSession && shouldStartTransaction) {
      try {
        await dbSession.abortTransaction();
      } catch (rollbackError) {
        logger.error('Error rolling back transaction', rollbackError instanceof Error ? rollbackError : undefined);
      }
    }

    // Enhanced error logging
    if (error instanceof Error) {
      logger.error(`Error creating room ${data.channelId}:`, error);
      logger.error(`Error message: ${error.message}`);
      
      // Check for specific MongoDB errors
      if ((error as any).code === 11000 || error.message.includes('duplicate key')) {
        logger.error(`Duplicate key error: Room with channelId ${data.channelId} already exists`);
      } else if (error.message.includes('validation failed')) {
        logger.error(`Validation error: ${error.message}`);
        // Log validation details if available
        if ((error as any).errors) {
          logger.error(`Validation details:`, JSON.stringify((error as any).errors, null, 2));
        }
      } else if (error.message.includes('Guild') || error.message.includes('User')) {
        logger.error(`Relation validation error: ${error.message}`);
      } else if (error.message.includes('connection') || error.message.includes('timeout')) {
        logger.error(`Database connection error: ${error.message}`);
      }
      
      if (error.stack) {
        logger.error(`Error stack:`, error.stack);
      }
    } else {
      logger.error('Unknown error creating room:', error);
    }
    
    throw error;
  } finally {
    // End session if we started it
    if (dbSession && shouldStartTransaction) {
      try {
        await dbSession.endSession();
      } catch (sessionError) {
        logger.error('Error ending session', sessionError instanceof Error ? sessionError : undefined);
      }
    }
  }
}

/**
 * Advanced createGuild with validation, joins, and transaction support
 */
export async function createGuildAdvanced(
  data: {
    discordId: string;
    name: string;
    ownerId?: string;
    icon?: string;
    memberCount?: number;
    prefix?: string;
  },
  options: CreateGuildOptions = {}
): Promise<IGuild | PopulatedGuild> {
  const {
    validateRelations = true,
    populate = false,
    useTransaction = false,
    session,
  } = options;

  // Start transaction if requested
  const shouldStartTransaction = useTransaction && !session;
  const dbSession = session || (shouldStartTransaction ? await mongoose.startSession() : undefined);

  try {
    if (dbSession && shouldStartTransaction) {
      dbSession.startTransaction();
    }

    // Validate owner exists if provided and validation is enabled
    if (validateRelations && data.ownerId) {
      const owner = await User.findOne({ discordId: data.ownerId })
        .session(dbSession || null);

      if (!owner) {
        throw new Error(`User with discordId ${data.ownerId} not found`);
      }

      logger.debug(`Validated owner for guild creation: owner=${data.ownerId}`);
    }

    // Check if guild already exists
    const existingGuild = await Guild.findOne({ discordId: data.discordId })
      .session(dbSession || null);
    
    if (existingGuild) {
      throw new Error(`Guild with discordId ${data.discordId} already exists`);
    }

    // Create the guild
    const guild = await Guild.create([data], { session: dbSession || undefined });
    const createdGuild = guild[0];

    // Commit transaction if we started it
    if (dbSession && shouldStartTransaction) {
      await dbSession.commitTransaction();
    }

    // Populate related data if requested
    if (populate && data.ownerId) {
      const owner = await User.findOne({ discordId: data.ownerId }).lean();
      
      const populatedGuild = {
        ...createdGuild.toObject(),
        owner: owner || null,
      } as PopulatedGuild;

      logger.debug(`Created guild ${data.discordId} with populated owner`);
      return populatedGuild;
    }

    logger.debug(`Created guild ${data.discordId}`);
    return createdGuild;
  } catch (error) {
    // Rollback transaction on error
    if (dbSession && shouldStartTransaction) {
      await dbSession.abortTransaction();
    }

    logger.error('Error creating guild', error instanceof Error ? error : undefined);
    throw error;
  } finally {
    // End session if we started it
    if (dbSession && shouldStartTransaction) {
      await dbSession.endSession();
    }
  }
}

/**
 * Create multiple rooms in a single transaction
 */
export async function createRoomsBulk(
  rooms: Array<{
    channelId: string;
    guildId: string;
    ownerId: string;
    locked?: boolean;
    hidden?: boolean;
    limit?: number;
  }>,
  options: {
    validateRelations?: boolean;
    populate?: boolean;
  } = {}
): Promise<(IRoom | PopulatedRoom)[]> {
  const { validateRelations = true, populate = false } = options;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Validate all relations first
    if (validateRelations) {
      const uniqueGuildIds = [...new Set(rooms.map(r => r.guildId))];
      const uniqueOwnerIds = [...new Set(rooms.map(r => r.ownerId))];

      const [guilds, owners] = await Promise.all([
        Guild.find({ discordId: { $in: uniqueGuildIds } }).session(session),
        User.find({ discordId: { $in: uniqueOwnerIds } }).session(session),
      ]);

      const guildIds = new Set(guilds.map(g => g.discordId));
      const ownerIds = new Set(owners.map(o => o.discordId));

      // Check for missing guilds
      const missingGuilds = uniqueGuildIds.filter(id => !guildIds.has(id));
      if (missingGuilds.length > 0) {
        throw new Error(`Guilds not found: ${missingGuilds.join(', ')}`);
      }

      // Check for missing owners
      const missingOwners = uniqueOwnerIds.filter(id => !ownerIds.has(id));
      if (missingOwners.length > 0) {
        throw new Error(`Users not found: ${missingOwners.join(', ')}`);
      }
    }

    // Check for duplicate channelIds
    const channelIds = rooms.map(r => r.channelId);
    const existingRooms = await Room.find({ channelId: { $in: channelIds } })
      .session(session);
    
    if (existingRooms.length > 0) {
      const existingIds = existingRooms.map(r => r.channelId);
      throw new Error(`Rooms already exist: ${existingIds.join(', ')}`);
    }

    // Create all rooms
    const createdRooms = await Room.insertMany(rooms, { session });

    await session.commitTransaction();

    // Populate if requested
    if (populate) {
      const populatedRooms = await Promise.all(
        createdRooms.map(async (room) => {
          const [guild, owner] = await Promise.all([
            Guild.findOne({ discordId: room.guildId }).lean(),
            User.findOne({ discordId: room.ownerId }).lean(),
          ]);

          return {
            ...room.toObject(),
            guild: guild || null,
            owner: owner || null,
          } as PopulatedRoom;
        })
      );

      logger.debug(`Created ${rooms.length} rooms with populated relations`);
      return populatedRooms;
    }

    logger.debug(`Created ${rooms.length} rooms in bulk`);
    return createdRooms;
  } catch (error) {
    await session.abortTransaction();
    logger.error('Error creating rooms in bulk', error instanceof Error ? error : undefined);
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Get room with populated relations
 */
export async function getRoomWithRelations(channelId: string): Promise<PopulatedRoom | null> {
  const room = await Room.findOne({ channelId }).lean();
  
  if (!room) {
    return null;
  }

  const [guild, owner] = await Promise.all([
    Guild.findOne({ discordId: room.guildId }).lean(),
    User.findOne({ discordId: room.ownerId }).lean(),
  ]);

  return {
    ...room,
    guild: guild || null,
    owner: owner || null,
  } as PopulatedRoom;
}

/**
 * Get rooms by guild with populated relations
 */
export async function getRoomsByGuildWithRelations(guildId: string): Promise<PopulatedRoom[]> {
  const rooms = await Room.find({ guildId }).lean();
  
  if (rooms.length === 0) {
    return [];
  }

  // Get unique owner IDs
  const ownerIds = [...new Set(rooms.map(r => r.ownerId))];
  const owners = await User.find({ discordId: { $in: ownerIds } }).lean();
  const ownerMap = new Map(owners.map(o => [o.discordId, o]));

  // Get guild data
  const guild = await Guild.findOne({ discordId: guildId }).lean();

  return rooms.map(room => ({
    ...room,
    guild: guild || null,
    owner: ownerMap.get(room.ownerId) || null,
  })) as PopulatedRoom[];
}

