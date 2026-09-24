/**
 * M2y Anomaly Detector - Lightweight metric monitoring
 * Detects spikes or drops using moving average.
 */

import eventBus from './event-bus.js';
import loggerTimeline from './logger-timeline.js';

class AnomalyDetector {
  constructor(maxHistory = 20, threshold = 2.0) {
    this.maxHistory = maxHistory;
    this.threshold = threshold; // Multiplier for standard deviation or simple ratio
    this.history = new Map(); // metricName -> values[]
  }

  /**
   * Add a new value for a metric and check for anomalies
   * @param {string} metricName - Name of the metric (e.g., 'leads_per_minute')
   * @param {number} value - Current value
   */
  analyze(metricName, value) {
    if (!this.history.has(metricName)) {
      this.history.set(metricName, []);
    }

    const values = this.history.get(metricName);
    
    // Need at least 5 values to start detecting reliably
    if (values.length >= 5) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      
      // Simple detection: if value is > 2x average (spike) or < 0.2x average (drop)
      // and the average is significant (> 0)
      if (avg > 0) {
        let type = null;
        if (value > avg * this.threshold) type = 'spike';
        if (value < avg * (1 / (this.threshold * 2))) type = 'drop';

        if (type) {
          const data = { metricName, value, avg, type, timestamp: new Date().toISOString() };
          
          // 1. Integrate with EventBus
          eventBus.emit('anomaly:detected', data);

          // 2. Register in LoggerTimeline
          loggerTimeline.log(
            'warn', 
            `Anomalia detectada em ${metricName}: ${type === 'spike' ? 'Pico' : 'Queda'} (${value.toFixed(2)} vs média ${avg.toFixed(2)})`,
            data
          );
        }
      }
    }

    // Update history
    values.push(value);
    if (values.length > this.maxHistory) {
      values.shift();
    }
  }
}

const anomalyDetector = new AnomalyDetector();
export default anomalyDetector;
