/**
 * M2y Logger Timeline - Event history management
 * Stores up to 200 logs with type, message, data and timestamp.
 */

class LoggerTimeline {
  constructor(maxLogs = 200) {
    this.maxLogs = maxLogs;
    this.logs = [];
  }

  /**
   * Add a new log entry
   * @param {string} type - Log type (info, warn, error, success)
   * @param {string} message - Log message
   * @param {any} data - Optional data payload
   */
  log(type, message, data = null) {
    const entry = {
      type,
      message,
      data,
      time: new Date().toISOString()
    };

    this.logs.unshift(entry); // Add to start

    // Maintain limit
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    return entry;
  }

  /**
   * Get all logs
   */
  get() {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
  }
}

const loggerTimeline = new LoggerTimeline();
export default loggerTimeline;
