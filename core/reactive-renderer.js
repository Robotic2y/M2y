/**
 * M2y Reactive Renderer - Lightweight DOM updates
 * Updates only changed parts of the UI based on state keys.
 */

class ReactiveRenderer {
  constructor() {
    this.lastState = {};
  }

  /**
   * Renders state changes to the DOM
   * @param {Object} state - Current application state
   * @param {Object} handlers - Map of state keys to update functions
   */
  render(state, handlers) {
    for (const [key, updateFn] of Object.entries(handlers)) {
      const currentValue = this.getNestedValue(state, key);
      const lastValue = this.getNestedValue(this.lastState, key);

      // Only update if value changed (simple JSON comparison for objects)
      if (JSON.stringify(currentValue) !== JSON.stringify(lastValue)) {
        updateFn(currentValue, state);
      }
    }
    this.lastState = JSON.parse(JSON.stringify(state));
  }

  /**
   * Helper to get nested values (e.g., 'metrics.totalLeads')
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }
}

const reactiveRenderer = new ReactiveRenderer();
export default reactiveRenderer;
