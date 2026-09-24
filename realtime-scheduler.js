/**
 * M2y Realtime Scheduler - Efficient update management
 * Handles periodic tasks with tab visibility awareness and dynamic intervals.
 */

class RealtimeScheduler {
  constructor() {
    this.timer = null;
    this.interval = 2000;
    this.task = null;
    this.isPaused = false;

    // Auto-pause when tab is hidden
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isPaused = document.hidden;
        console.log(`Scheduler ${this.isPaused ? 'paused' : 'resumed'} (tab hidden)`);
      });
    }
  }

  /**
   * Start the scheduler with a task and interval
   */
  start(task, intervalMs) {
    this.stop();
    this.task = task;
    this.interval = intervalMs || this.interval;
    
    const run = async () => {
      if (!this.isPaused && this.task) {
        await this.task();
      }
      this.timer = setTimeout(run, this.interval);
    };
    
    this.timer = setTimeout(run, this.interval);
  }

  /**
   * Update the interval dynamically (e.g., from AutoMode)
   */
  update(newIntervalMs) {
    this.interval = newIntervalMs;
    console.log(`Scheduler interval updated to ${this.interval}ms`);
  }

  /**
   * Stop the scheduler and clear timers
   */
  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

const realtimeScheduler = new RealtimeScheduler();
export default realtimeScheduler;
