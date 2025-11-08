import {
  ActionRowBuilder,
  ButtonInteraction,
  MessageFlags,
  UserSelectMenuBuilder,
  VoiceChannel,
} from 'discord.js';
import { Button } from '../../structures/Button';
import { getRoom } from '../../models/Room';

export default class DisconnectButton extends Button {
  constructor(client: any) {
    super(client, {
      id: 'voice-disconnect',
      customId: 'voice-disconnect',
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
      const menu = new UserSelectMenuBuilder()
        .setCustomId('voice-disconnect-menu')
        .setPlaceholder('Select user to disconnect')
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder<UserSelectMenuBuilder>().setComponents(menu);
      await interaction.reply({
        content: 'Select user to disconnect',
        flags: MessageFlags.Ephemeral,
        components: [row],
      });
    }
  }
}

