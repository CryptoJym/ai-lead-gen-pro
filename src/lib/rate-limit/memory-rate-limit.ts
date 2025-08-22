// In-memory rate limiter for local deployments
export class MemoryRateLimiter {
  private counters: Map<string, number> = new Map();
  private expiryTimers: Map<string, NodeJS.Timeout> = new Map();

  async incr(key: string): Promise<number> {
    const current = this.counters.get(key) || 0;
    const newValue = current + 1;
    this.counters.set(key, newValue);
    return newValue;
  }

  async decr(key: string): Promise<number> {
    const current = this.counters.get(key) || 0;
    const newValue = Math.max(0, current - 1);
    if (newValue === 0) {
      this.counters.delete(key);
    } else {
      this.counters.set(key, newValue);
    }
    return newValue;
  }

  async get(key: string): Promise<string | null> {
    const value = this.counters.get(key);
    return value !== undefined ? value.toString() : null;
  }

  async del(key: string): Promise<void> {
    this.counters.delete(key);
    const timer = this.expiryTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.expiryTimers.delete(key);
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    // Clear existing timer if any
    const existingTimer = this.expiryTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new expiry timer
    const timer = setTimeout(() => {
      this.counters.delete(key);
      this.expiryTimers.delete(key);
    }, seconds * 1000);

    this.expiryTimers.set(key, timer);
  }

  async flushAll(): Promise<void> {
    this.counters.clear();
    this.expiryTimers.forEach(timer => clearTimeout(timer));
    this.expiryTimers.clear();
  }
}