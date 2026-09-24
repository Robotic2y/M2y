/**
 * M2y Plugin System - Lightweight extensibility framework
 * Allows registering and initializing plugins with system context.
 */

class PluginSystem {
  constructor() {
    this.plugins = new Map();
    this.context = null;
  }

  /**
   * Registers a new plugin
   * @param {string} name - Unique name for the plugin
   * @param {Object} plugin - Plugin object with init(context) method
   */
  register(name, plugin) {
    if (typeof plugin.init !== 'function') {
      console.warn(`Plugin ${name} ignored: missing init(context) method.`);
      return;
    }
    this.plugins.set(name, plugin);
  }

  /**
   * Initializes all registered plugins
   * @param {Object} context - System context (EventBus, StateManager, etc.)
   */
  init(context) {
    this.context = context;
    this.plugins.forEach((plugin, name) => {
      try {
        plugin.init(this.context);
        console.log(`Plugin ${name} initialized successfully.`);
      } catch (error) {
        console.error(`Error initializing plugin ${name}:`, error);
      }
    });
  }
}

const pluginSystem = new PluginSystem();
export default pluginSystem;
