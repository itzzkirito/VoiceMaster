import { ButtonInteraction, MessageFlags, VoiceChannel } from 'discord.js';
import { Button } from '../../structures/Button';
import { getRoom, updateRoom } from '../../models/Room';

export default class DecreaseButton extends Button {
  constructor(client: any) {
    super(client, {
      id: 'voice-decrease-limit',
      customId: 'voice-decrease-limit',
    });
  }

  public async execute(interaction: ButtonInteraction): Promise<any> {
    if (!interaction.guild) return;
    const voice = interaction.guild?.members.cache.get(interaction.user.id)?.voice.channel;
    if (!voice) return;
    const room = await getRoom(voice.id);
    if (!room) return;
    if (room.ownerId !== interaction.user.id) {
      return interaction.reply({
        content: 'You are not the owner of this room.',
        flags: MessageFlags.Ephemeral,
      });
    }
    if (voice instanceof VoiceChannel) {
      const currentLimit = voice.userLimit || 0;
      if (currentLimit <= 0) {
        return interaction.reply({
          content: 'Minimum limit reached (0 = unlimited).',
          flags: MessageFlags.Ephemeral,
        });
      }
      const newLimit = Math.max(0, currentLimit - 1);
      await voice.setUserLimit(newLimit);
      await updateRoom(voice.id, {
        ...(newLimit !== 0 && { limit: newLimit }),
      });
      return interaction.reply({
        content: `➖ Decreased the limit to ${newLimit === 0 ? 'unlimited' : newLimit}.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

