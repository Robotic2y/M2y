/**
 * M2y Idle Mode - Smart User Inactivity Detection
 * Monitors mouse, keyboard, and scroll events to pause/resume system tasks.
 */

import eventBus from './event-bus.js';

class IdleMode {
  constructor(timeoutMs = 15000) {
    this.timeoutMs = timeoutMs;
    this.timer = null;
    this.isIdle = false;
    this.events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    this.boundReset = this.reset.bind(this);
  }

  /**
   * Initializes idle detection
   */
  init() {
    if (typeof window === 'undefined') return;

    this.events.forEach(event => {
      window.addEventListener(event, this.boundReset, { passive: true });
    });

    this.startTimer();
    console.log('[IdleMode] Initialized (15s timeout)');
  }

  /**
   * Resets the idle timer and sets state to active
   */
  reset() {
    if (this.isIdle) {
      this.isIdle = false;
      eventBus.emit('user:active', { timestamp: Date.now() });
      console.log('[IdleMode] User active');
    }

    clearTimeout(this.timer);
    this.startTimer();
  }

  /**
   * Starts the inactivity timer
   */
  startTimer() {
    this.timer = setTimeout(() => {
      this.isIdle = true;
      eventBus.emit('user:idle', { timestamp: Date.now(), duration: this.timeoutMs });
      console.log('[IdleMode] User idle');
    }, this.timeoutMs);
  }

  /**
   * Cleans up listeners
   */
  destroy() {
    if (typeof window === 'undefined') return;
    this.events.forEach(event => {
      window.removeEventListener(event, this.boundReset);
    });
    clearTimeout(this.timer);
  }
}

const idleMode = new IdleMode();
export default idleMode;
