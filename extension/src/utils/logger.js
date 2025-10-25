// Logger Utility
// Centralized logging with different levels

const Logger = {
  // Log levels
  LEVELS: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  },

  // Current log level (can be changed for debugging)
  currentLevel: 1, // INFO by default

  /**
   * Set the minimum log level
   * @param {number} level - Log level from LEVELS
   */
  setLevel(level) {
    this.currentLevel = level;
  },

  /**
   * Log debug message (detailed information for debugging)
   * @param {...any} args - Arguments to log
   */
  debug(...args) {
    if (this.currentLevel <= this.LEVELS.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Log info message (general information)
   * @param {...any} args - Arguments to log
   */
  info(...args) {
    if (this.currentLevel <= this.LEVELS.INFO) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Log warning message (potential issues)
   * @param {...any} args - Arguments to log
   */
  warn(...args) {
    if (this.currentLevel <= this.LEVELS.WARN) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Log error message (actual errors)
   * @param {...any} args - Arguments to log
   */
  error(...args) {
    if (this.currentLevel <= this.LEVELS.ERROR) {
      console.error('[ERROR]', ...args);
    }
  },

  /**
   * Log with custom emoji prefix (always shows)
   * @param {string} emoji - Emoji to use
   * @param {...any} args - Arguments to log
   */
  emoji(emoji, ...args) {
    console.log(emoji, ...args);
  },

  /**
   * Group related log messages
   * @param {string} label - Group label
   */
  group(label) {
    console.group(label);
  },

  /**
   * End a log group
   */
  groupEnd() {
    console.groupEnd();
  },

  /**
   * Log extraction progress
   * @param {string} step - Current step
   * @param {Object} data - Additional data
   */
  extraction(step, data = {}) {
    const details = Object.keys(data).length > 0
      ? ` (${Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ')})`
      : '';
    this.info(`✅ ${step}${details}`);
  },

  /**
   * Log with a timer
   * @param {string} label - Timer label
   */
  time(label) {
    console.time(label);
  },

  /**
   * End a timer
   * @param {string} label - Timer label
   */
  timeEnd(label) {
    console.timeEnd(label);
  },
};

// Make available to other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logger;
}
