import {
  ActionRowBuilder,
  ButtonInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
  VoiceChannel,
} from 'discord.js';
import { Button } from '../../structures/Button';
import { getRoom } from '../../models/Room';

export default class ActivityButton extends Button {
  constructor(client: any) {
    super(client, {
      id: 'voice-activity',
      customId: 'voice-activity',
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
      const stringMenu = new StringSelectMenuBuilder()
        .setCustomId('activity-select')
        .setPlaceholder('Select an activity')
        .addOptions([
          {
            label: 'YouTube Together',
            value: 'youtube',
            description: 'Watch YouTube videos together with your friends!',
          },
          {
            label: 'Poker Night',
            value: 'poker',
            description: 'Play poker with your friends!',
          },
          {
            label: 'Betrayal.io',
            value: 'betrayal',
            description: 'A game of betrayal in which one player is the traitor.',
          },
          {
            label: 'Fishington.io',
            value: 'fishing',
            description: 'Fishing competition with your friends!',
          },
          {
            label: 'Chess In The Park',
            value: 'chess',
            description: 'Chess in the Park is a chess variant where you can play against your friends!',
          },
          {
            label: 'Wordle',
            value: 'wordle',
            description: 'A daily wordle game with your friends!',
          },
          {
            label: 'Doodle Crew',
            value: 'doodlecrew',
            description: 'A game for creativity!',
          },
          {
            label: 'SpellCast',
            value: 'spellcast',
            description: 'A game for spelling!',
          },
          {
            label: 'Checkers',
            value: 'checkers',
            description: 'A game for checking!',
          },
          {
            label: 'Sketch Heads',
            value: 'sketchheads',
            description: 'A game for sketching!',
          },
          {
            label: 'Sketchy Artist',
            value: 'sketchyartist',
            description: 'A game for sketching!',
          },
          {
            label: 'Ocho',
            value: 'ocho',
            description: 'A game for ocho!',
          },
          {
            label: 'Putt Party',
            value: 'puttparty',
            description: 'A game for putting!',
          },
        ]);
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(stringMenu);
      return interaction.reply({
        content: 'Select an activity',
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

