import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVoiceCreator extends Document {
  guildId: string;
  categoryId: string;
  voiceChannelId: string;
  textChannelId: string;
  createdAt: Date;
  updatedAt: Date;
}

const VoiceCreatorSchema: Schema = new Schema<IVoiceCreator>(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    categoryId: {
      type: String,
      required: true,
    },
    voiceChannelId: {
      type: String,
      required: true,
    },
    textChannelId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// No need for explicit index - guildId already has index: true and unique: true

export const VoiceCreator: Model<IVoiceCreator> =
  mongoose.models.VoiceCreator ||
  mongoose.model<IVoiceCreator>('VoiceCreator', VoiceCreatorSchema);

// Helper functions for easier access
export async function getVoiceCreatorByGuildId(
  guildId: string
): Promise<IVoiceCreator | null> {
  return VoiceCreator.findOne({ guildId });
}

export async function updateVoiceCreator(
  guildId: string,
  categoryId: string,
  data: {
    voiceChannelId?: string;
    textChannelId?: string;
    categoryId?: string;
  }
): Promise<IVoiceCreator> {
  return VoiceCreator.findOneAndUpdate(
    { guildId },
    { guildId, categoryId, ...data },
    { upsert: true, new: true }
  );
}

export async function deleteVoiceCreator(guildId: string): Promise<void> {
  await VoiceCreator.deleteOne({ guildId });
}

