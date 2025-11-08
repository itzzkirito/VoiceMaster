import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGuild extends Document {
  discordId: string;
  name: string;
  icon?: string;
  ownerId?: string;
  memberCount?: number;
  createdAt: Date;
  updatedAt: Date;
  // Custom settings
  prefix?: string;
  welcomeChannelId?: string;
  welcomeMessage?: string;
  leaveChannelId?: string;
  leaveMessage?: string;
  musicChannelId?: string;
  autoRoleId?: string;
  logChannelId?: string;
  disabledCommands?: string[];
  customSettings?: Record<string, unknown>;
  // Blacklist fields
  isBlacklisted?: boolean;
  blacklistedAt?: Date;
  blacklistedBy?: string;
  blacklistReason?: string;
}

const GuildSchema: Schema = new Schema<IGuild>(
  {
    discordId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      index: true, // Index for search operations
    },
    icon: {
      type: String,
    },
    ownerId: {
      type: String,
      index: true, // Index for filtering by owner
    },
    memberCount: {
      type: Number,
    },
    prefix: {
      type: String,
      default: '!',
    },
    welcomeChannelId: {
      type: String,
      index: true, // Index for channel lookups
    },
    welcomeMessage: {
      type: String,
    },
    leaveChannelId: {
      type: String,
    },
    leaveMessage: {
      type: String,
    },
    musicChannelId: {
      type: String,
    },
    autoRoleId: {
      type: String,
    },
    logChannelId: {
      type: String,
    },
    disabledCommands: {
      type: [String],
      default: [],
    },
    customSettings: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Blacklist fields
    isBlacklisted: {
      type: Boolean,
      default: false,
      index: true, // Index for filtering blacklisted guilds
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

// Compound index for common query patterns
GuildSchema.index({ isBlacklisted: 1, discordId: 1 });

export const Guild: Model<IGuild> = mongoose.models.Guild || mongoose.model<IGuild>('Guild', GuildSchema);

