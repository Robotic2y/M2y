/**
 * M2y v2.11 - Progress Bar State Persistence
 * Mantém estado da barra de progresso após reload
 */

class ProgressPersistence {
  constructor() {
    this.stateKey = 'progressState';
  }

  async saveState(metrics, status) {
    const state = {
      timestamp: Date.now(),
      metrics,
      status
    };
    await chrome.storage.local.set({ [this.stateKey]: state });
  }

  async loadState() {
    const data = await chrome.storage.local.get(this.stateKey);
    return data[this.stateKey] || null;
  }

  async clearState() {
    await chrome.storage.local.remove(this.stateKey);
  }

  isStateValid(state) {
    if (!state) return false;
    const age = Date.now() - state.timestamp;
    const maxAge = 30 * 60 * 1000; // 30 minutos
    return age < maxAge && state.status === 'running';
  }
}

const progressPersistence = new ProgressPersistence();
export default progressPersistence;
