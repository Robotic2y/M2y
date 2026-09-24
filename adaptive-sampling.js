/**
 * M2y Adaptive Metrics Sampling - Intelligent Data Collection
 * Adjusts sampling intervals (500ms-4000ms) based on data volatility.
 * High change rate = frequent sampling; Low change rate = sparse sampling.
 */

import eventBus from './event-bus.js';
import realtimeScheduler from './realtime-scheduler.js';

class AdaptiveSampling {
  constructor(minInterval = 500, maxInterval = 4000) {
    this.min = minInterval;
    this.max = maxInterval;
    this.currentInterval = 1000;
    this.lastValue = null;
    this.sensitivity = 0.1; // 10% change triggers faster sampling
    
    // Listen for anomalies to instantly increase sampling
    eventBus.on('anomaly:detected', () => this.boost());
  }

  /**
   * Evaluates the new value and adapts the sampling interval
   * @param {number} newValue - Current metric value
   */
  evaluate(newValue) {
    if (this.lastValue === null) {
      this.lastValue = newValue;
      return this.currentInterval;
    }

    const diff = Math.abs(newValue - this.lastValue);
    const changeRatio = this.lastValue !== 0 ? diff / this.lastValue : diff;

    if (changeRatio > this.sensitivity) {
      // Data is volatile, increase frequency (decrease interval)
      this.increaseFrequency();
    } else {
      // Data is stable, decrease frequency (increase interval)
      this.decreaseFrequency();
    }

    this.lastValue = newValue;
    this.apply();
    
    return this.currentInterval;
  }

  /**
   * Instantly sets sampling to maximum frequency
   */
  boost() {
    this.currentInterval = this.min;
    this.apply();
    console.log('[AdaptiveSampling] Boosted frequency due to anomaly');
  }

  /**
   * Decreases interval (faster sampling)
   */
  increaseFrequency() {
    this.currentInterval = Math.max(this.min, this.currentInterval * 0.7);
  }

  /**
   * Increases interval (slower sampling)
   */
  decreaseFrequency() {
    this.currentInterval = Math.min(this.max, this.currentInterval + 200);
  }

  /**
   * Applies the current interval to the scheduler
   */
  apply() {
    realtimeScheduler.update(this.currentInterval);
  }

  /**
   * Wraps a collection task with adaptive sampling
   * @param {Function} collectFn - Function that returns a numeric metric
   * @param {Object} anomalyDetector - Instance of AnomalyDetector
   */
  async monitor(collectFn, anomalyDetector) {
    const value = await collectFn();
    
    // Adapt sampling based on value change
    this.evaluate(value);
    
    // Also feed anomaly detector
    if (anomalyDetector) {
      anomalyDetector.analyze('adaptive_metric', value);
    }
    
    return value;
  }
}

const adaptiveSampling = new AdaptiveSampling();
export default adaptiveSampling;
