/**
 * M2y Performance Guard - Resource protection & monitoring
 * Measures execution time using performance.now() and triggers safety events.
 */

import eventBus from './event-bus.js';
import loggerTimeline from './logger-timeline.js';

class PerformanceGuard {
  constructor(defaultThreshold = 100) {
    this.defaultThreshold = defaultThreshold; // ms
  }

  /**
   * Measures the execution time of a function
   * @param {string} name - Metric name for tracking
   * @param {Function} fn - Function to execute
   * @param {number} threshold - Time limit in ms before triggering warning
   * @returns {any} Result of the function
   */
  measure(name, fn, threshold = this.defaultThreshold) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const duration = end - start;

    if (duration > threshold) {
      const data = { name, duration, threshold, timestamp: new Date().toISOString() };
      
      // Emit event for other modules to react (e.g., autoMode)
      eventBus.emit('performance:slow', data);

      // Register in timeline
      loggerTimeline.log(
        'warn',
        `Lentidão detectada em ${name}: ${duration.toFixed(2)}ms (Limite: ${threshold}ms)`,
        data
      );
    }

    return result;
  }
}

const performanceGuard = new PerformanceGuard();
export default performanceGuard;
