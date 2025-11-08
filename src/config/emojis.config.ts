/**
 * Centralized Emoji Configuration
 * All emojis used throughout the bot are defined here for easy management
 */

export const emojis = {
  // VoiceMaster Buttons
  voiceMaster: {
    lock: '🔒',
    unlock: '🔓',
    hide: '👻',
    unhide: '👁️',
    info: 'ℹ️',
    disconnect: '⏹️',
    claim: '⭐',
    activity: '🎮',
    increase: '➕',
    decrease: '➖',
  },

  // Status Emojis
  status: {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    loading: '⏳',
    checkmark: '✓',
    cross: '✗',
  },

  // General Emojis
  general: {
    bot: '🤖',
    server: '📊',
    user: '👥',
    channel: '📺',
    command: '🔌',
    settings: '⚙️',
    music: '🎵',
    voice: '🎤',
    private: '🔒',
    public: '🌐',
  },

  // Actions
  actions: {
    play: '▶️',
    pause: '⏸️',
    stop: '⏹️',
    skip: '⏭️',
    previous: '⏮️',
    repeat: '🔁',
    shuffle: '🔀',
    volume: '🔊',
    mute: '🔇',
    add: '➕',
    remove: '➖',
    edit: '✏️',
    delete: '🗑️',
    save: '💾',
    cancel: '❌',
    confirm: '✅',
  },

  // Numbers
  numbers: {
    zero: '0️⃣',
    one: '1️⃣',
    two: '2️⃣',
    three: '3️⃣',
    four: '4️⃣',
    five: '5️⃣',
    six: '6️⃣',
    seven: '7️⃣',
    eight: '8️⃣',
    nine: '9️⃣',
    ten: '🔟',
  },

  // Categories
  categories: {
    voice: '🎤',
    music: '🎵',
    admin: '🛡️',
    general: '📋',
    fun: '🎉',
    utility: '🔧',
    owner: '👑',
    moderation: '⚖️',
  },
} as const;

/**
 * Get emoji by path
 * Example: getEmoji('voiceMaster.lock') returns '🔒'
 */
export function getEmoji(path: string): string {
  const parts = path.split('.');
  let value: any = emojis;
  
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part as keyof typeof value];
    } else {
      return '❓'; // Return question mark if emoji not found
    }
  }
  
  return typeof value === 'string' ? value : '❓';
}

/**
 * VoiceMaster button emojis (quick access)
 */
export const voiceMasterEmojis = emojis.voiceMaster;

/**
 * Status emojis (quick access)
 */
export const statusEmojis = emojis.status;

/**
 * Action emojis (quick access)
 */
export const actionEmojis = emojis.actions;

