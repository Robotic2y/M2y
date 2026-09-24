/**
 * M2y Predictive Scheduler - Light Load Trend Analysis
 * Maintains a history of execution durations and predicts load spikes to adjust intervals.
 */

import eventBus from './event-bus.js';
import autoThrottle from './auto-throttle.js';

class PredictiveScheduler {
  constructor(maxHistory = 10) {
    this.history = [];
    this.maxHistory = maxHistory;
    this.trendThreshold = 1.2; // 20% increase triggers throttle
    
    // Listen to performance events to feed the predictor
    eventBus.on('performance:slow', (data) => this.record(data.duration));
  }

  /**
   * Records a new duration and analyzes the trend
   * @param {number} duration - Execution time in ms
   */
  record(duration) {
    this.history.push(duration);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.analyze();
  }

  /**
   * Analyzes history for upward trends in execution time
   */
  analyze() {
    if (this.history.length < 3) return;

    const recent = this.history[this.history.length - 1];
    const average = this.history.reduce((a, b) => a + b, 0) / this.history.length;

    // If recent execution is significantly higher than average, predict spike
    if (recent > average * this.trendThreshold) {
      this.predictSpike(recent, average);
    }
  }

  /**
   * Triggers preventive throttling when a spike is predicted
   */
  predictSpike(recent, average) {
    console.warn(`[Predictive] Load spike detected: ${recent.toFixed(2)}ms vs avg ${average.toFixed(2)}ms`);
    
    // Proactively increase interval via AutoThrottle
    autoThrottle.increase();
    
    eventBus.emit('predictive:throttle', {
      predicted: true,
      recent,
      average
    });
  }

  /**
   * Wraps a task with predictive monitoring
   * @param {string} name - Task name
   * @param {Function} taskFn - The task to execute
   * @param {Object} performanceGuard - Instance of PerformanceGuard
   */
  async monitor(name, taskFn, performanceGuard) {
    const start = performance.now();
    const result = await taskFn();
    const duration = performance.now() - start;
    
    this.record(duration);
    
    // Also use performance guard for threshold-based warnings
    performanceGuard.measure(name, () => {}, 100); // Silent measure for threshold
    
    return result;
  }
}

const predictiveScheduler = new PredictiveScheduler();
export default predictiveScheduler;
