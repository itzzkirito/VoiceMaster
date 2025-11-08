import { ButtonInteraction, MessageFlags, VoiceChannel } from 'discord.js';
import { Button } from '../../structures/Button';
import { getRoom, updateRoom } from '../../models/Room';

export default class UnhideButton extends Button {
  constructor(client: any) {
    super(client, {
      id: 'voice-unhide',
      customId: 'voice-unhide',
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
      await voice.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        ViewChannel: true,
      });
      await updateRoom(voice.id, { hidden: false });
      return interaction.reply({
        content: '👁️ Unhidden the room.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

