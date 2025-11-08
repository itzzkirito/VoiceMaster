import { ButtonInteraction, MessageFlags, VoiceChannel } from 'discord.js';
import { Button } from '../../structures/Button';
import { getRoom, updateRoom } from '../../models/Room';

export default class IncreaseButton extends Button {
  constructor(client: any) {
    super(client, {
      id: 'voice-increase-limit',
      customId: 'voice-increase-limit',
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
      if (currentLimit >= 99) {
        return interaction.reply({
          content: 'Maximum limit reached (99).',
          flags: MessageFlags.Ephemeral,
        });
      }
      const newLimit = currentLimit + 1;
      await voice.setUserLimit(newLimit);
      await updateRoom(voice.id, { limit: newLimit });
      return interaction.reply({
        content: `➕ Increased the limit to ${newLimit}.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

