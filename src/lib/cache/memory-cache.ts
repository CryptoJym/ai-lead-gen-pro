// In-memory cache implementation for local deployments
export class MemoryCache {
  private cache: Map<string, { value: any; expiry: number }> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiry = Date.now() + (ttlSeconds * 1000);
    
    // Clear existing timer if any
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new value
    this.cache.set(key, { value, expiry });
    
    // Set cleanup timer
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttlSeconds * 1000);
    
    this.timers.set(key, timer);
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  async flushAll(): Promise<void> {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  async size(): Promise<number> {
    return this.cache.size;
  }
}