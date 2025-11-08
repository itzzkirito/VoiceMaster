import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  discordId: string;
  username: string;
  discriminator?: string;
  avatar?: string;
  bot?: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Custom fields
  xp?: number;
  level?: number;
  coins?: number;
  premium?: boolean;
  premiumUntil?: Date;
  // No-prefix fields
  noPrefix?: boolean;
  noPrefixAddedBy?: string;
  noPrefixAddedAt?: Date;
  // Blacklist fields
  isBlacklisted?: boolean;
  blacklistedAt?: Date;
  blacklistedBy?: string;
  blacklistReason?: string;
}

const UserSchema: Schema = new Schema<IUser>(
  {
    discordId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      index: true, // Index for search operations
    },
    discriminator: {
      type: String,
    },
    avatar: {
      type: String,
    },
    bot: {
      type: Boolean,
      default: false,
    },
    xp: {
      type: Number,
      default: 0,
      index: true, // Index for leaderboards
    },
    level: {
      type: Number,
      default: 1,
      index: true, // Index for filtering by level
    },
    coins: {
      type: Number,
      default: 0,
    },
    premium: {
      type: Boolean,
      default: false,
      index: true, // Index for filtering premium users
    },
    premiumUntil: {
      type: Date,
      index: true, // Index for filtering expired premiums
    },
    // No-prefix fields
    noPrefix: {
      type: Boolean,
      default: false,
      index: true, // Index for filtering no-prefix users
    },
    noPrefixAddedBy: {
      type: String,
    },
    noPrefixAddedAt: {
      type: Date,
    },
    // Blacklist fields
    isBlacklisted: {
      type: Boolean,
      default: false,
      index: true, // Index for filtering blacklisted users
    },
    blacklistedAt: {
      type: Date,
    },
    blacklistedBy: {
      type: String,
    },
    blacklistReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common query patterns
UserSchema.index({ xp: -1, level: -1 }); // Leaderboard queries
UserSchema.index({ isBlacklisted: 1, discordId: 1 }); // Blacklist filtering
UserSchema.index({ noPrefix: 1, discordId: 1 }); // No-prefix user lookups
UserSchema.index({ premium: 1, premiumUntil: 1 }); // Premium user queries

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

