/**
 * M2y State Manager - Global State Management for Chrome Extension
 * Single source of truth for application state with persistence and reactivity.
 */

import eventBus from './event-bus.js';
import stateSync from './state-sync.js';
import idleMode from './idle-mode.js';
import realtimeScheduler from './realtime-scheduler.js';
import loggerTimeline from './logger-timeline.js';
import predictiveScheduler from './predictive-scheduler.js';
import adaptiveSampling from './adaptive-sampling.js';
import selfHealing from './self-healing.js';

class StateManager {
  constructor() {
    this.state = {
      progress: 0,
      metrics: {
        totalLeads: 0,
        successRate: 0,
        averageTime: 0
      },
      autoMode: false,
      system: {
        os: 'unknown',
        browser: 'chrome',
        version: '2.11.0'
      },
      lastUpdate: Date.now()
    };
    this.listeners = new Set();
    
    // Initialize StateSync on instantiation
    if (typeof window !== 'undefined') {
      stateSync.init(this);
      this.initIdleMode();
      this.initPredictiveScheduler();
      this.initAdaptiveSampling();
      this.initSelfHealing();
    }
  }

  /**
   * Initializes Self-Healing Engine and its event listeners
   */
  initSelfHealing() {
    // Escuta mudanças de estado para rodar o check de saúde
    eventBus.on('state:update', (state) => {
      selfHealing.check(state);
    });

    // Escuta por eventos de recuperação para ações específicas
    eventBus.on('self-heal', (data) => {
      // Exemplo de recuperação: Reiniciar o Scheduler se o progresso estiver travado
      if (data.issues.includes('progress_stalled')) {
        console.log('[StateManager] Self-Heal: Reiniciando Scheduler devido a travamento');
        
        // Reinicia o scheduler com as configurações atuais do modo auto
        const currentMode = this.state.currentMode || 'STANDARD';
        realtimeScheduler.stop();
        setTimeout(() => {
          realtimeScheduler.start(() => {
            // Task placeholder que será substituída pelo plugin real
            console.log('Scheduler reiniciado pelo Self-Healing');
          }, this.state.interval || 2000);
        }, 500);

        loggerTimeline.log('success', 'Self-Healing: Scheduler reiniciado com sucesso');
      }
    });
  }

  /**
   * Initializes Adaptive Sampling and its event listeners
   */
  initAdaptiveSampling() {
    // Escuta por anomalias para notificar sobre amostragem adaptativa
    eventBus.on('anomaly:detected', (data) => {
      loggerTimeline.log('info', `Amostragem Adaptativa: Aumentando frequência devido a anomalia em ${data.metricName}`);
      console.log('[StateManager] Adaptive sampling frequency boosted');
    });
  }

  /**
   * Initializes Predictive Scheduler and its event listeners
   */
  initPredictiveScheduler() {
    // Escuta por eventos de aceleração preditiva
    eventBus.on('predictive:throttle', (data) => {
      loggerTimeline.log('warn', `Predição: Aumento de carga detectado (${data.recent.toFixed(2)}ms)`, data);
      console.log('[StateManager] Predictive throttling applied');
    });
  }

  /**
   * Initializes Smart Idle Mode and its event listeners
   */
  initIdleMode() {
    idleMode.init();

    // Listen for idle events via EventBus
    eventBus.on('user:idle', () => {
      realtimeScheduler.isPaused = true;
      loggerTimeline.log('info', 'Smart Idle: Sistema pausado por inatividade');
      console.log('[StateManager] Scheduler paused due to user idle');
    });

    eventBus.on('user:active', () => {
      realtimeScheduler.isPaused = false;
      loggerTimeline.log('success', 'Smart Idle: Sistema reativado (usuário ativo)');
      console.log('[StateManager] Scheduler resumed (user active)');
    });
  }

  /**
   * Returns the current state (read-only copy)
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Updates the state and notifies subscribers
   * @param {Object} newState - Partial state update
   */
  setState(newState) {
    this.state = {
      ...this.state,
      ...newState,
      lastUpdate: Date.now()
    };
    this.notify();
    this.persist();
    
    // Emit event via EventBus for global reactivity
    eventBus.emit('state:update', this.getState());
  }

  /**
   * Subscribes a listener to state changes
   * @param {Function} callback - Function to call on change
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifies all subscribers of a state change
   */
  notify() {
    const currentState = this.getState();
    this.listeners.forEach(callback => callback(currentState));
  }

  /**
   * Persists the current state to chrome.storage.local
   */
  async persist() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ m2y_global_state: this.state });
    }
  }

  /**
   * Hydrates the state from chrome.storage.local
   */
  async hydrate() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const result = await chrome.storage.local.get('m2y_global_state');
      if (result.m2y_global_state) {
        this.state = {
          ...this.state,
          ...result.m2y_global_state
        };
        this.notify();
      }
    }
    return this.state;
  }
}

// Export as a singleton
const stateManager = new StateManager();
export default stateManager;
