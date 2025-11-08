import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRoom extends Document {
  channelId: string;
  guildId: string;
  ownerId: string;
  locked: boolean;
  hidden: boolean;
  limit?: number;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema: Schema = new Schema<IRoom>(
  {
    channelId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    locked: {
      type: Boolean,
      default: false,
    },
    hidden: {
      type: Boolean,
      default: false,
    },
    limit: {
      type: Number,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// No need for explicit indexes - fields already have index: true
// channelId has unique: true which creates an index
// guildId and ownerId have index: true

export const Room: Model<IRoom> =
  mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);

// Helper functions for easier access
export async function getRoom(channelId: string): Promise<IRoom | null> {
  return Room.findOne({ channelId });
}

export async function getRoomsByOwner(ownerId: string): Promise<IRoom[]> {
  return Room.find({ ownerId });
}

export async function getAllRooms(): Promise<IRoom[]> {
  return Room.find({});
}

export async function getRoomsByGuild(guildId: string): Promise<IRoom[]> {
  return Room.find({ guildId });
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
}

/**
 * Create a room with advanced options for validation, joins, and transactions
 * 
 * @example
 * // Simple create (backward compatible)
 * const room = await createRoom({ channelId: '123', guildId: '456', ownerId: '789' });
 * 
 * @example
 * // Create with validation and populated relations
 * const room = await createRoom(
 *   { channelId: '123', guildId: '456', ownerId: '789' },
 *   { validateRelations: true, populate: true }
 * );
 * 
 * @example
 * // Create with transaction
 * const room = await createRoom(
 *   { channelId: '123', guildId: '456', ownerId: '789' },
 *   { useTransaction: true }
 * );
 */
export async function createRoom(
  data: {
    channelId: string;
    guildId: string;
    ownerId: string;
    locked?: boolean;
    hidden?: boolean;
    limit?: number;
  },
  options: CreateRoomOptions = {}
): Promise<IRoom> {
  const {
    validateRelations = false,
    populate = false,
    useTransaction = false,
  } = options;

  // If no advanced features are needed, use simple create for better performance
  if (!validateRelations && !populate && !useTransaction) {
    try {
      // Check if room already exists
      const existingRoom = await Room.findOne({ channelId: data.channelId });
      if (existingRoom) {
        throw new Error(`Room with channelId ${data.channelId} already exists`);
      }
      
      // Simple create - no validation, no transaction, no population
      const room = await Room.create(data);
      return room;
    } catch (error) {
      // Re-throw with more context
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to create room: ${String(error)}`);
    }
  }

  // Use advanced function for validation, population, or transactions
  const { createRoomAdvanced } = await import('../services/advancedDatabase');
  
  return createRoomAdvanced(data, {
    validateRelations,
    populate,
    useTransaction,
  }) as Promise<IRoom>;
}

export async function updateRoom(
  channelId: string,
  data: Partial<IRoom>
): Promise<IRoom | null> {
  return Room.findOneAndUpdate({ channelId }, data, { new: true });
}

export async function deleteRoom(channelId: string): Promise<void> {
  await Room.deleteOne({ channelId });
}

