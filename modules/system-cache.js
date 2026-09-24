/**
 * M2y System Cache - Simple persistent cache for system detection
 * Reduces redundant hardware/OS detection calls using chrome.storage.local.
 */

class SystemCache {
  constructor(storageKey = 'm2y_system_cache') {
    this.storageKey = storageKey;
  }

  /**
   * Get value from cache if not expired
   */
  async get(key) {
    const result = await chrome.storage.local.get(this.storageKey);
    const cache = result[this.storageKey] || {};
    const entry = cache[key];

    if (!entry) return null;
    if (entry.expiry && Date.now() > entry.expiry) {
      await this.remove(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Set value in cache with optional TTL (seconds)
   */
  async set(key, value, ttlSeconds = null) {
    const result = await chrome.storage.local.get(this.storageKey);
    const cache = result[this.storageKey] || {};
    
    cache[key] = {
      value,
      expiry: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null
    };

    await chrome.storage.local.set({ [this.storageKey]: cache });
  }

  /**
   * Get from cache or run detection function
   */
  async getOrDetect(key, detectFn, ttlSeconds = 3600) {
    const cached = await this.get(key);
    if (cached) return cached;

    const detected = await detectFn();
    await this.set(key, detected, ttlSeconds);
    return detected;
  }

  async remove(key) {
    const result = await chrome.storage.local.get(this.storageKey);
    const cache = result[this.storageKey] || {};
    delete cache[key];
    await chrome.storage.local.set({ [this.storageKey]: cache });
  }
}

const systemCache = new SystemCache();
export default systemCache;
