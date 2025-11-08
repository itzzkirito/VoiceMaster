import { UserSelectMenuInteraction, MessageFlags, VoiceChannel } from 'discord.js';
import { Menu } from '../../structures/Menu';
import { getRoom } from '../../models/Room';

export default class VoiceDisconnectMenu extends Menu {
  constructor(client: any) {
    super(client, {
      id: 'voice-disconnect-menu',
      customId: 'voice-disconnect-menu',
    });
  }

  public async execute(interaction: UserSelectMenuInteraction): Promise<any> {
    if (!interaction.guild) return;

    const voice = interaction.guild?.members.cache.get(interaction.user.id)?.voice.channel;
    if (!voice) {
      return interaction.reply({
        content: 'You must be in a voice channel.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const room = await getRoom(voice.id);
    if (!room) {
      return interaction.reply({
        content: 'This is not a private room.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (room.ownerId !== interaction.user.id) {
      return interaction.reply({
        content: 'You are not the owner of this room.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const targetUserId = interaction.values[0];
    if (!targetUserId) {
      return interaction.reply({
        content: 'Please select a user.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
    if (!targetMember) {
      return interaction.reply({
        content: 'User not found.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!targetMember.voice.channel || targetMember.voice.channel.id !== voice.id) {
      return interaction.reply({
        content: 'User is not in this voice channel.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (voice instanceof VoiceChannel) {
      await targetMember.voice.disconnect('Disconnected by room owner');
      return interaction.reply({
        content: `✅ Disconnected ${targetMember.user.tag} from the voice channel.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

