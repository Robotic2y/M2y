/**
 * M2y Auto Throttle - Dynamic interval management
 * Adjusts execution intervals (500ms-5000ms) based on system performance and stability.
 */

import eventBus from './event-bus.js';
import realtimeScheduler from './realtime-scheduler.js';

class AutoThrottle {
  constructor(min = 500, max = 5000) {
    this.min = min;
    this.max = max;
    this.current = 1000; // Default start interval
    this.step = 500;

    // 1. Integrar com PerformanceGuard (Lentidão -> Aumentar Intervalo)
    eventBus.on('performance:slow', () => this.increase());

    // 2. Reduzir intervalo em estabilidade (Estado atualizado -> Reduzir Intervalo)
    eventBus.on('state:update', () => this.decrease());
  }

  /**
   * Returns current throttle interval
   */
  get() {
    return this.current;
  }

  /**
   * Increases interval (throttles down) to save resources
   */
  increase() {
    if (this.current < this.max) {
      this.current = Math.min(this.max, this.current + this.step);
      this.apply();
    }
  }

  /**
   * Decreases interval (throttles up) for better responsiveness
   */
  decrease() {
    if (this.current > this.min) {
      this.current = Math.max(this.min, this.current - 100); // Gradual decrease
      this.apply();
    }
  }

  /**
   * Applies current interval to RealtimeScheduler
   */
  apply() {
    realtimeScheduler.update(this.current);
  }
}

const autoThrottle = new AutoThrottle();
export default autoThrottle;
