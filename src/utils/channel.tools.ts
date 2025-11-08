import { BotClient } from '../client';

export async function changeChannelStatus(
  channelId: string,
  status: string,
  client: BotClient
): Promise<void> {
  try {
    await client.rest.put(`/channels/${channelId}/voice-status`, {
      body: {
        status: status,
      },
    });
  } catch (error) {
    // Ignore errors - channel might not support status updates
  }
}

