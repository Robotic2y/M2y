/**
 * M2y Event Bus - Simple Pub/Sub for Chrome Extension
 * Minimal event system to replace polling with event-driven architecture.
 */

class EventBus {
  constructor() {
    this.events = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);
    return () => this.events.get(event).delete(callback);
  }

  /**
   * Emit an event with data
   * @param {string} event - Event name
   * @param {any} data - Data to pass to listeners
   */
  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(callback => callback(data));
    }
  }

  /**
   * Clear all listeners for an event or all events
   * @param {string} [event] - Optional event name to clear
   */
  clear(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

const eventBus = new EventBus();
export default eventBus;
