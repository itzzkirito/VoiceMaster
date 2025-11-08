import { StringSelectMenuInteraction, MessageFlags, Routes } from 'discord.js';
import { Menu } from '../../structures/Menu';

const defaultApplications: Record<string, string> = {
  youtube: '880218394199220334',
  poker: '755827207812677713',
  betrayal: '773336526917861400',
  fishing: '814288819477020702',
  chess: '832012774040141894',
  wordle: '879863686565621790',
  doodlecrew: '878067389634314250',
  spellcast: '852509694341283871',
  checkers: '832013003968348200',
  sketchheads: '902271654783242291',
  ocho: '832025144389533716',
  puttparty: '763133495793942528',
  sketchyartist: '879864070101172255',
};

export default class ActivitySelectMenu extends Menu {
  constructor(client: any) {
    super(client, {
      id: 'activity-select',
      customId: 'activity-select',
    });
  }

  public async execute(interaction: StringSelectMenuInteraction): Promise<any> {
    const voice = interaction.guild?.members.cache.get(interaction.user.id)?.voice.channel;
    if (!voice) {
      return interaction.reply({
        content: 'You must be in a voice channel to use this.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const value = interaction.values[0];
    if (!value) return;

    const applicationId = defaultApplications[value];
    if (!applicationId) {
      return interaction.reply({
        content: 'Invalid activity selected.',
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const route = Routes.channelInvites(voice.id);
      const invite = (await interaction.client.rest.post(route, {
        body: {
          max_age: 86400,
          max_uses: 0,
          target_application_id: applicationId,
          target_type: 2,
          temporary: false,
          validate: null,
        },
      })) as any;

      return interaction.reply({
        content: `[Click to open ${invite.target_application?.name || value} in ${voice.name}](https://discord.com/invite/${invite.code})`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('Activity select error:', error);
      return interaction.reply({
        content: 'Failed to create activity invite.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

