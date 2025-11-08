import { ButtonInteraction, EmbedBuilder, MessageFlags, VoiceChannel } from 'discord.js';
import { Button } from '../../structures/Button';
import { getRoom } from '../../models/Room';
import { botConfig } from '../../config/bot.config';

export default class ViewButton extends Button {
  constructor(client: any) {
    super(client, {
      id: 'voice-view',
      customId: 'voice-view',
    });
  }

  public async execute(interaction: ButtonInteraction): Promise<any> {
    if (!interaction.guild) return;
    const voice = interaction.guild?.members.cache.get(interaction.user.id)?.voice.channel;
    if (!voice) return;
    const room = await getRoom(voice.id);
    if (!room) return;
    if (voice instanceof VoiceChannel) {
      const owner = interaction.guild?.members.cache.get(room.ownerId);
      const avatarURL = owner?.user.displayAvatarURL();
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${owner?.user.username || 'Unknown'}`,
          ...(avatarURL && { iconURL: avatarURL }),
        })
        .setColor(botConfig.colors.main as any)
        .setDescription(
          [
            `**${owner?.user.username || 'Unknown'}'s room**`,
            '',
            `Owner: ${owner?.user.username || 'Unknown'} (\`${owner?.id || 'Unknown'}\`)`,
            `Locked: ${room.locked ? '🔒 Yes' : '🔓 No'}`,
            `Hidden: ${room.hidden ? '👻 Yes' : '👁️ No'}`,
            `Created: <t:${Math.floor(voice.createdTimestamp / 1000)}:R>`,
            `Bitrate: ${voice.bitrate / 1000}kbps`,
            `Connected: \`${voice.members.size}\``,
            room.limit ? `Limit: \`${room.limit}\`` : 'Limit: `Unlimited`',
          ].join('\n')
        );

      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

