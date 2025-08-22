import { Redis } from 'ioredis';
import { createHash } from 'crypto';
import { MemoryCache } from './cache/memory-cache';

// Use Redis if available, otherwise fall back to in-memory cache
let cacheClient: Redis | MemoryCache;

if (process.env.REDIS_URL && process.env.REDIS_URL !== 'memory') {
  try {
    cacheClient = new Redis(process.env.REDIS_URL);
  } catch (error) {
    console.log('Redis connection failed, falling back to in-memory cache');
    cacheClient = new MemoryCache();
  }
} else {
  cacheClient = new MemoryCache();
}

// Cache TTL settings (in seconds)
const TTL = {
  OSINT: 3600,        // 1 hour for OSINT data
  JOB_SEARCH: 1800,   // 30 minutes for job searches
  RESEARCH: 86400,    // 24 hours for full research results
  DEFAULT: 3600       // 1 hour default
};

export class CacheService {
  private prefix: string;
  
  constructor(prefix: string = 'cache') {
    this.prefix = prefix;
  }
  
  private generateKey(namespace: string, data: any): string {
    const hash = createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
    return `${this.prefix}:${namespace}:${hash}`;
  }
  
  async get<T>(namespace: string, keyData: any): Promise<T | null> {
    if (process.env.ENABLE_CACHE === 'false') {
      return null;
    }
    
    const key = this.generateKey(namespace, keyData);
    
    try {
      const cached = await cacheClient.get(key);
      if (cached && typeof cached === 'string') {
        return JSON.parse(cached) as T;
      } else if (cached) {
        return cached as T;
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }
    
    return null;
  }
  
  async set<T>(
    namespace: string, 
    keyData: any, 
    value: T, 
    ttl?: number
  ): Promise<void> {
    if (process.env.ENABLE_CACHE === 'false') {
      return;
    }
    
    const key = this.generateKey(namespace, keyData);
    const ttlSeconds = ttl || TTL[namespace as keyof typeof TTL] || TTL.DEFAULT;
    
    try {
      if (cacheClient instanceof Redis) {
        await cacheClient.setex(
          key,
          ttlSeconds,
          JSON.stringify(value)
        );
      } else {
        await cacheClient.set(key, value, ttlSeconds);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  async invalidate(namespace: string, keyData: any): Promise<void> {
    const key = this.generateKey(namespace, keyData);
    
    try {
      await cacheClient.del(key);
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }
  
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await cacheClient.keys(`${this.prefix}:${pattern}:*`);
      if (keys.length > 0) {
        if (cacheClient instanceof Redis) {
          await cacheClient.del(...keys);
        } else {
          // For memory cache, delete one by one
          for (const key of keys) {
            await cacheClient.del(key);
          }
        }
      }
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
    }
  }
}

// Export singleton instances
export const cache = new CacheService();

// Cache decorators for methods
export function Cacheable(namespace: string, ttl?: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Generate cache key from method name and arguments
      const keyData = {
        method: propertyKey,
        args
      };
      
      // Try to get from cache
      const cached = await cache.get(namespace, keyData);
      if (cached !== null) {
        return cached;
      }
      
      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Cache the result
      await cache.set(namespace, keyData, result, ttl);
      
      return result;
    };
    
    return descriptor;
  };
}

// Cache warming utilities
export async function warmCache(): Promise<void> {
  console.log('Cache warming not implemented yet');
  // In production, this would pre-populate common queries
}

// Cache statistics
export async function getCacheStats(): Promise<{
  keys: number;
  memory: string;
  hits: number;
  misses: number;
}> {
  try {
    if (cacheClient instanceof Redis) {
      const info = await cacheClient.info('stats');
      const stats = info.split('\r\n').reduce((acc, line) => {
        const [key, value] = line.split(':');
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      return {
        keys: await cacheClient.dbsize(),
        memory: stats.used_memory_human || 'unknown',
        hits: parseInt(stats.keyspace_hits || '0'),
        misses: parseInt(stats.keyspace_misses || '0')
      };
    } else {
      // For memory cache
      return {
        keys: await cacheClient.size(),
        memory: 'in-memory',
        hits: 0, // Memory cache doesn't track hits/misses
        misses: 0
      };
    }
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return {
      keys: 0,
      memory: 'unknown',
      hits: 0,
      misses: 0
    };
  }
}