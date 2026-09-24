/**
 * M2y State Sync - Tab Synchronization for Chrome Extension
 * Listens for changes in chrome.storage.local to keep state in sync across tabs.
 */

import eventBus from './event-bus.js';

class StateSync {
  constructor() {
    this.isInitialized = false;
    this.manager = null;
  }

  /**
   * Initializes the synchronization listener
   * @param {Object} manager - The StateManager instance
   */
  init(manager) {
    if (this.isInitialized || typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.onChanged) {
      return;
    }

    this.manager = manager;

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.m2y_global_state) {
        const newState = changes.m2y_global_state.newValue;
        const oldState = changes.m2y_global_state.oldValue;

        // Sync if the new state exists and is newer than our local state
        if (newState && (!oldState || newState.lastUpdate > this.manager.state.lastUpdate)) {
          this.syncState(newState);
        }
      }
    });

    this.isInitialized = true;
    console.log('[StateSync] Initialized');
  }

  /**
   * Updates the StateManager with external changes and emits event
   * @param {Object} externalState - The new state from storage
   */
  syncState(externalState) {
    if (!this.manager) return;

    // Update the StateManager internally without triggering persistence again
    this.manager.state = { ...this.manager.state, ...externalState };
    this.manager.notify();

    // Emit event via EventBus for components that need to react to external changes
    eventBus.emit('state:external', externalState);
    
    console.log('[StateSync] State synchronized from external source');
  }
}

const stateSync = new StateSync();
export default stateSync;
