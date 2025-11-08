import { VoiceState, ChannelType, VoiceChannel } from 'discord.js';
import { Event } from '../../structures/Event';
import { logger } from '../../utils/logger';
import { getVoiceCreatorByGuildId } from '../../models/VoiceCreator';
import { getRoom, createRoom, deleteRoom } from '../../models/Room';
import mongoose from 'mongoose';

export default class VoiceStateUpdateEvent extends Event<'voiceStateUpdate'> {
  private deletionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super({
      name: 'voiceStateUpdate',
      once: false,
    });
  }

  async execute(oldState: VoiceState, newState: VoiceState) {
    try {
      // User joined a voice channel
      if (!oldState.channel && newState.channel) {
        await this.handleVoiceJoin(newState);
      }

      // User left a voice channel
      if (oldState.channel && !newState.channel) {
        await this.handleVoiceLeave(oldState);
      }

      // User switched channels
      if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        await this.handleVoiceSwitch(oldState, newState);
      }
    } catch (error) {
      logger.error('Error in voiceStateUpdate event:', error);
    }
  }

  /**
   * Cancel pending deletion for a room (if someone rejoins)
   */
  private cancelRoomDeletion(channelId: string): void {
    const timeout = this.deletionTimeouts.get(channelId);
    if (timeout) {
      clearTimeout(timeout);
      this.deletionTimeouts.delete(channelId);
      logger.debug(`Cancelled deletion for room ${channelId} - user rejoined`);
    }
  }

  private async handleVoiceJoin(state: VoiceState) {
    if (!state.guild || !state.channel || !state.member) return;

    const voiceCreator = await getVoiceCreatorByGuildId(state.guild.id);
    if (!voiceCreator) return;

    // Check if user joined the "Join to Create" channel
    if (state.channel.id === voiceCreator.voiceChannelId) {
      await this.createPrivateRoom(state);
      return;
    }

    // Check if user joined a private room
    const room = await getRoom(state.channel.id);
    if (room) {
      // Cancel any pending deletion if someone rejoined
      this.cancelRoomDeletion(state.channel.id);

      // Check if room is locked
      if (room.locked) {
        // Room is locked - check if user has permission to be in the room
        // Owner always has permission (set when room is created)
        if (state.member.id === room.ownerId) {
          // Owner can always join, no need to disconnect
          return;
        }

        // Get permissions for this user
        const permissions = state.channel.permissionsFor(state.member);
        
        // Check if user has Connect permission
        // When room is locked:
        // - @everyone has Connect denied
        // - Owner has Connect allowed (set when room created)
        // - Users allowed via vcallow have Connect allowed
        // - Users rejected via vcreject have Connect denied
        const hasConnectPermission = permissions?.has('Connect') ?? false;
        
        if (!hasConnectPermission) {
          // User doesn't have Connect permission - disconnect them
          logger.info(`[VOICEMASTER] Disconnecting user ${state.member.id} (${state.member.user.tag}) from locked room ${state.channel.id} - no Connect permission`);
          try {
            await state.member.voice.disconnect('Room is locked - you do not have permission to join');
          } catch (error) {
            logger.error(`[VOICEMASTER] Failed to disconnect user from locked room:`, error instanceof Error ? error : undefined);
          }
        } else {
          // User has permission (was allowed via vcallow), allow them to stay
          logger.debug(`[VOICEMASTER] User ${state.member.id} has permission to join locked room ${state.channel.id}`);
        }
      }
      // If room is not locked, anyone can join (permissions are handled by Discord)
    }
  }

  private async handleVoiceLeave(state: VoiceState) {
    if (!state.guild || !state.channel) return;

    const channelId = state.channel.id;
    const guildId = state.guild.id; // Store guild ID immediately
    const client = state.guild.client; // Store client reference
    
    const room = await getRoom(channelId);
    if (!room) {
      logger.debug(`[VOICEMASTER] Room ${channelId} not found in database, skipping deletion check`);
      return;
    }

    logger.debug(`[VOICEMASTER] User left room ${channelId}, checking if empty...`);

    // Wait a bit to allow Discord to update the member list
    // Then check if the channel is actually empty
    setTimeout(async () => {
      try {
        // Fetch guild and channel again to get the current state
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) {
          logger.warn(`[VOICEMASTER] Guild ${guildId} not found, cleaning up room ${channelId} from database`);
          await deleteRoom(channelId).catch(() => {});
          return;
        }

        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (!channel || channel.type !== ChannelType.GuildVoice) {
          // Channel doesn't exist anymore, remove from database
          logger.info(`[VOICEMASTER] Channel ${channelId} no longer exists, cleaning up database`);
          await deleteRoom(channelId).catch(() => {});
          return;
        }

        const voiceChannel = channel as VoiceChannel;
        const currentRoom = await getRoom(channelId);
        
        // If room was deleted from database, skip
        if (!currentRoom) {
          logger.debug(`[VOICEMASTER] Room ${channelId} was deleted from database, skipping`);
          return;
        }

        // Check if channel is empty
        if (voiceChannel.members.size === 0) {
          logger.info(`[VOICEMASTER] Room ${channelId} is empty, scheduling deletion in 15 seconds...`);
          
          // Cancel any existing deletion timeout for this room
          this.cancelRoomDeletion(channelId);
          
          // Wait 15 seconds before deleting (in case user rejoins)
          const timeout = setTimeout(async () => {
            try {
              // Remove timeout from map
              this.deletionTimeouts.delete(channelId);
              
              // Final check - fetch guild and channel again to make sure it's still empty
              const finalGuild = await client.guilds.fetch(guildId).catch(() => null);
              if (!finalGuild) {
                logger.warn(`[VOICEMASTER] Guild ${guildId} not found during deletion, cleaning up database`);
                await deleteRoom(channelId).catch(() => {});
                return;
              }

              const finalChannel = await finalGuild.channels.fetch(channelId).catch(() => null);
              if (!finalChannel || finalChannel.type !== ChannelType.GuildVoice) {
                // Channel already deleted, just clean up database
                logger.info(`[VOICEMASTER] Channel ${channelId} already deleted, cleaning up database`);
                await deleteRoom(channelId).catch(() => {});
                return;
              }

              const finalVoiceChannel = finalChannel as VoiceChannel;
              const finalRoom = await getRoom(channelId);
              
              // Double check room still exists and channel is still empty
              if (!finalRoom) {
                logger.debug(`[VOICEMASTER] Room ${channelId} was deleted from database, skipping deletion`);
                return;
              }

              if (finalVoiceChannel.members.size === 0) {
                logger.info(`[VOICEMASTER] Deleting empty room ${channelId}...`);
                
                // Check bot permissions before attempting deletion
                const botMember = await finalGuild.members.fetch(finalGuild.client.user.id).catch(() => null);
                if (!botMember) {
                  logger.error(`[VOICEMASTER] Bot member not found in guild ${guildId}, cannot delete room ${channelId}`);
                  return;
                }

                const botPermissions = finalVoiceChannel.permissionsFor(botMember);
                const hasManageChannels = botPermissions?.has('ManageChannels') ?? false;
                
                if (!hasManageChannels) {
                  logger.error(`[VOICEMASTER] Bot lacks ManageChannels permission for room ${channelId}, cannot delete`);
                  // Still try to clean up database
                  await deleteRoom(channelId).catch(() => {});
                  return;
                }

                // Delete the voice channel
                try {
                  await finalVoiceChannel.delete('Room is empty - auto-deleted by VoiceMaster');
                  logger.info(`[VOICEMASTER] ✅ Successfully deleted voice channel ${channelId}`);
                } catch (deleteError) {
                  logger.error(`[VOICEMASTER] ❌ Failed to delete voice channel ${channelId}:`, deleteError instanceof Error ? deleteError : undefined);
                  // Try to get more details about the error
                  if (deleteError instanceof Error) {
                    if (deleteError.message.includes('Missing Permissions')) {
                      logger.error(`[VOICEMASTER] Bot lacks permissions to delete channel ${channelId}`);
                    } else if (deleteError.message.includes('rate limit')) {
                      logger.warn(`[VOICEMASTER] Rate limited while deleting channel ${channelId}, will retry on next cleanup`);
                      // Don't delete from database if rate limited, will try again later
                      return;
                    }
                  }
                }

                // Delete from database
                try {
                  await deleteRoom(channelId);
                  logger.info(`[VOICEMASTER] ✅ Successfully deleted room ${channelId} from database`);
                } catch (dbError) {
                  logger.error(`[VOICEMASTER] ❌ Failed to delete room ${channelId} from database:`, dbError instanceof Error ? dbError : undefined);
                }

                logger.info(`[VOICEMASTER] ✅ Successfully deleted empty room ${channelId}`);
              } else {
                logger.debug(`[VOICEMASTER] Room ${channelId} is no longer empty (${finalVoiceChannel.members.size} members), skipping deletion`);
              }
            } catch (error) {
              logger.error(`[VOICEMASTER] ❌ Error in final deletion check for room ${channelId}:`, error instanceof Error ? error : undefined);
              if (error instanceof Error) {
                logger.error(`[VOICEMASTER] Error stack:`, error.stack);
              }
              this.deletionTimeouts.delete(channelId);
            }
          }, 15000); // Wait 15 seconds before final deletion
          
          // Store timeout so we can cancel it if someone rejoins
          this.deletionTimeouts.set(channelId, timeout);
        } else {
          logger.debug(`[VOICEMASTER] Room ${channelId} still has ${voiceChannel.members.size} members, not deleting`);
        }
      } catch (error) {
        logger.error(`[VOICEMASTER] ❌ Error checking room ${channelId} for deletion:`, error instanceof Error ? error : undefined);
        if (error instanceof Error) {
          logger.error(`[VOICEMASTER] Error stack:`, error.stack);
        }
      }
    }, 1000); // Wait 1 second for Discord to update member list
  }

  private async handleVoiceSwitch(oldState: VoiceState, newState: VoiceState) {
    // Handle leave from old channel
    await this.handleVoiceLeave(oldState);

    // Handle join to new channel
    await this.handleVoiceJoin(newState);
  }

  private async createPrivateRoom(state: VoiceState) {
    if (!state.guild || !state.channel || !state.member) {
      logger.warn('[VOICEMASTER] Cannot create room: Missing guild, channel, or member');
      return;
    }

    try {
      // Check if database is connected
      if (mongoose.connection.readyState !== 1) {
        logger.error('[VOICEMASTER] Cannot create room: Database not connected');
        await state.member.voice.disconnect('Database not connected - please try again later').catch(() => {});
        return;
      }

      const voiceCreator = await getVoiceCreatorByGuildId(state.guild.id);
      if (!voiceCreator) {
        logger.debug(`[VOICEMASTER] No voice creator found for guild ${state.guild.id}`);
        return;
      }

      // Fetch and validate category
      let category;
      try {
        category = await state.guild.channels.fetch(voiceCreator.categoryId);
      } catch (fetchError) {
        logger.error(`[VOICEMASTER] Failed to fetch category ${voiceCreator.categoryId}:`, fetchError instanceof Error ? fetchError : undefined);
        await state.member.voice.disconnect('VoiceMaster category not found - please contact server admin').catch(() => {});
        return;
      }

      if (!category || category.type !== ChannelType.GuildCategory) {
        logger.error(`[VOICEMASTER] Invalid category: ${voiceCreator.categoryId} (type: ${category?.type})`);
        await state.member.voice.disconnect('Invalid VoiceMaster category - please contact server admin').catch(() => {});
        return;
      }

      // Check bot permissions in the category
      const botMember = await state.guild.members.fetch(state.guild.client.user.id).catch(() => null);
      if (!botMember) {
        logger.error('[VOICEMASTER] Bot member not found');
        await state.member.voice.disconnect('Bot error - please contact server admin').catch(() => {});
        return;
      }

      const botPermissions = category.permissionsFor(botMember);
      const hasManageChannels = botPermissions?.has('ManageChannels') ?? false;
      const hasConnect = botPermissions?.has('Connect') ?? false;
      const hasMoveMembers = botPermissions?.has('MoveMembers') ?? false;
      
      if (!hasManageChannels || !hasConnect || !hasMoveMembers) {
        const missingPerms = [];
        if (!hasManageChannels) missingPerms.push('ManageChannels');
        if (!hasConnect) missingPerms.push('Connect');
        if (!hasMoveMembers) missingPerms.push('MoveMembers');
        
        logger.error(`[VOICEMASTER] Bot lacks permissions in category ${category.id}. Missing: ${missingPerms.join(', ')}`);
        await state.member.voice.disconnect(`Bot lacks permissions: ${missingPerms.join(', ')} - please contact server admin`).catch(() => {});
        return;
      }

      // Sanitize channel name (Discord has restrictions)
      const channelName = `${state.member.user.username}'s Room`.slice(0, 100); // Max 100 chars

      // Create new private voice channel
      let newChannel;
      try {
        newChannel = await state.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildVoice,
          parent: category.id,
          permissionOverwrites: [
            {
              id: state.guild.id,
              deny: ['Connect'],
            },
            {
              id: state.member.id,
              allow: ['Connect', 'ManageChannels', 'Speak'],
            },
          ],
        });
        logger.info(`[VOICEMASTER] Created voice channel ${newChannel.id} for user ${state.member.id}`);
      } catch (createError) {
        logger.error(`[VOICEMASTER] Failed to create channel:`, createError instanceof Error ? createError : undefined);
        if (createError instanceof Error) {
          if (createError.message.includes('Missing Permissions')) {
            await state.member.voice.disconnect('Bot lacks permissions to create channels').catch(() => {});
          } else if (createError.message.includes('rate limit')) {
            await state.member.voice.disconnect('Rate limited - please try again in a moment').catch(() => {});
          } else {
            await state.member.voice.disconnect('Failed to create room - please try again').catch(() => {});
          }
        }
        return;
      }

      // Move user to new channel
      try {
        await state.member.voice.setChannel(newChannel.id);
        logger.debug(`[VOICEMASTER] Moved user ${state.member.id} to channel ${newChannel.id}`);
      } catch (moveError) {
        logger.error(`[VOICEMASTER] Failed to move user to channel:`, moveError instanceof Error ? moveError : undefined);
        // Try to delete the channel we just created
        await newChannel.delete('Failed to move user').catch(() => {});
        await state.member.voice.disconnect('Failed to move to new room').catch(() => {});
        return;
      }

      // Create room in database
      try {
        // Double-check database connection before creating room
        if (mongoose.connection.readyState !== 1) {
          throw new Error(`Database not connected (readyState: ${mongoose.connection.readyState})`);
        }

        // Disable validation since we don't require Guild/User to exist in DB for room creation
        // The room creation should work even if Guild/User aren't in the database yet
        await createRoom(
          {
            channelId: newChannel.id,
            guildId: state.guild.id,
            ownerId: state.member.id,
            locked: false,
            hidden: false,
          },
          {
            validateRelations: false, // Don't validate - room creation should work independently
            populate: false,
            useTransaction: false,
          }
        );
        logger.info(`[VOICEMASTER] ✅ Created private room ${newChannel.id} for user ${state.member.id} (${state.member.user.tag})`);
      } catch (dbError) {
        // Enhanced error logging
        logger.error(`[VOICEMASTER] ❌ Failed to save room to database:`, dbError instanceof Error ? dbError : undefined);
        if (dbError instanceof Error) {
          logger.error(`[VOICEMASTER] Error message: ${dbError.message}`);
          logger.error(`[VOICEMASTER] Error stack:`, dbError.stack);
          
          // Check for specific error types
          if (dbError.message.includes('duplicate key') || dbError.message.includes('E11000')) {
            logger.error(`[VOICEMASTER] Room ${newChannel.id} already exists in database (duplicate key error)`);
          } else if (dbError.message.includes('Guild') || dbError.message.includes('User')) {
            logger.error(`[VOICEMASTER] Validation error: ${dbError.message}`);
          } else if (dbError.message.includes('connection') || dbError.message.includes('timeout')) {
            logger.error(`[VOICEMASTER] Database connection error: ${dbError.message}`);
          } else {
            logger.error(`[VOICEMASTER] Unknown database error: ${dbError.message}`);
          }
        }
        
        // Channel was created but database save failed - try to clean up
        try {
          logger.warn(`[VOICEMASTER] Cleaning up channel ${newChannel.id} due to database error`);
          await newChannel.delete('Database save failed').catch((deleteErr) => {
            logger.error(`[VOICEMASTER] Failed to delete channel after database error:`, deleteErr instanceof Error ? deleteErr : undefined);
          });
          await state.member.voice.disconnect('Database error - room creation failed').catch(() => {});
        } catch (cleanupError) {
          logger.error(`[VOICEMASTER] Failed to cleanup after database error:`, cleanupError instanceof Error ? cleanupError : undefined);
        }
      }
    } catch (error) {
      logger.error('[VOICEMASTER] Unexpected error creating private room:', error instanceof Error ? error : undefined);
      if (error instanceof Error) {
        logger.error(`[VOICEMASTER] Error stack:`, error.stack);
      }
      if (state.member) {
        await state.member.voice.disconnect('Unexpected error creating room').catch(() => {});
      }
    }
  }
}

