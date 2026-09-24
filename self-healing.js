/**
 * M2y Self-Healing Engine - Automatic System Recovery
 * Monitors global state for inconsistencies and triggers recovery actions.
 */

import eventBus from './event-bus.js';
import loggerTimeline from './logger-timeline.js';

class SelfHealing {
  constructor() {
    this.isHealing = false;
    this.lastCheck = Date.now();
  }

  /**
   * Checks the current state for anomalies or stalled progress
   * @param {Object} state - The current application state
   */
  check(state) {
    if (!state) return;

    const issues = [];

    // 1. Detect missing metrics
    if (!state.metrics || typeof state.metrics.totalLeads === 'undefined') {
      issues.push('metrics_missing');
    }

    // 2. Detect stalled progress (example: if update is too old but autoMode is on)
    const timeSinceUpdate = Date.now() - (state.lastUpdate || 0);
    if (state.autoMode && timeSinceUpdate > 30000) { // 30s without update in auto mode
      issues.push('progress_stalled');
    }

    if (issues.length > 0) {
      this.heal(issues, state);
    }
  }

  /**
   * Triggers recovery actions based on detected issues
   * @param {Array} issues - List of detected issue codes
   * @param {Object} state - Current state
   */
  heal(issues, state) {
    if (this.isHealing) return;
    this.isHealing = true;

    console.warn(`[SelfHealing] Issues detected: ${issues.join(', ')}. Initiating recovery...`);

    // Log the recovery attempt
    loggerTimeline.log('warn', `Self-Healing: Recuperação iniciada (${issues.join(', ')})`);

    // Emit event for other modules to react (e.g., restart scheduler)
    eventBus.emit('self-heal', { 
      issues, 
      timestamp: Date.now(),
      originalState: { ...state }
    });

    // Reset healing flag after a cooldown
    setTimeout(() => {
      this.isHealing = false;
    }, 5000);
  }
}

const selfHealing = new SelfHealing();
export default selfHealing;
