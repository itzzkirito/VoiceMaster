import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICommandBlacklist extends Document {
  commandName: string;
  addedBy: string;
  addedAt: Date;
  reason?: string;
}

const CommandBlacklistSchema: Schema = new Schema<ICommandBlacklist>(
  {
    commandName: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
    },
    addedBy: {
      type: String,
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// No need for explicit index - commandName already has index: true and unique: true

export const CommandBlacklist: Model<ICommandBlacklist> =
  mongoose.models.CommandBlacklist ||
  mongoose.model<ICommandBlacklist>('CommandBlacklist', CommandBlacklistSchema);

