/**
 * M2y Auto Mode Engine - Adaptive performance management
 * Resolves operation mode based on system score to balance speed and resources.
 */

import eventBus from './event-bus.js';

class AutoModeEngine {
  constructor() {
    this.performanceWarning = false;
    
    // Auto protection: React to slow performance
    eventBus.on('performance:slow', () => {
      this.performanceWarning = true;
      // Keep safety mode for 60 seconds
      setTimeout(() => { this.performanceWarning = false; }, 60000);
    });

    this.MODES = {
      REALTIME_HEAVY: { id: 'realtime-heavy', interval: 500,  batch: 10, label: 'Ultra Performance' },
      BALANCED:       { id: 'balanced',       interval: 2000, batch: 5,  label: 'Equilibrado' },
      PERFORMANCE:    { id: 'performance',    interval: 1000, batch: 8,  label: 'Otimizado' },
      BATTERY:        { id: 'battery',        interval: 5000, batch: 2,  label: 'Economia de Energia' }
    };
  }

  /**
   * Resolves the best mode based on system metrics
   * @param {Object} system - System info (cores, memory, battery)
   * @returns {Object} Mode configuration
   */
  resolve(system = {}) {
    // If performance warning is active, force BATTERY mode to save resources
    if (this.performanceWarning) return this.MODES.BATTERY;

    const cores = system.cores || 4;
    const memory = system.memory || 4;
    const isBattery = system.isBattery || false;

    // Simple heuristic score
    let score = (cores * 2) + memory;
    if (isBattery) score -= 5;

    if (score >= 20) return this.MODES.REALTIME_HEAVY;
    if (score >= 12) return this.MODES.PERFORMANCE;
    if (isBattery || score < 8) return this.MODES.BATTERY;
    
    return this.MODES.BALANCED;
  }
}

const autoModeEngine = new AutoModeEngine();
export default autoModeEngine;
