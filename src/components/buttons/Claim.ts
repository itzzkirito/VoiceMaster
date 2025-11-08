import { ButtonInteraction, MessageFlags, VoiceChannel } from 'discord.js';
import { Button } from '../../structures/Button';
import { getRoom, updateRoom } from '../../models/Room';

export default class ClaimButton extends Button {
  constructor(client: any) {
    super(client, {
      id: 'voice-claim',
      customId: 'voice-claim',
    });
  }

  public async execute(interaction: ButtonInteraction): Promise<any> {
    if (!interaction.guild) return;
    const voice = interaction.guild?.members.cache.get(interaction.user.id)?.voice.channel;
    if (!voice) return;
    const room = await getRoom(voice.id);
    if (!room) return;
    const allMembers = voice.members;
    if (voice instanceof VoiceChannel) {
      // check if owner is in the room
      if (allMembers.find((member) => member.id === room.ownerId)) {
        return interaction.reply({
          content: 'Owner is in the room.',
          flags: MessageFlags.Ephemeral,
        });
      }
      // claim the room
      await updateRoom(voice.id, { ownerId: interaction.user.id });
      return interaction.reply({
        content: '⭐ Claimed the room.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

