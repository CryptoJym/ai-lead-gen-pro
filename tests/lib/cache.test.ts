import { getCachedResult, setCachedResult, invalidateCache } from '@/lib/cache';
import { Redis } from 'ioredis';
import { MemoryCache } from '@/lib/cache/memory-cache';

// Mock Redis and MemoryCache
jest.mock('ioredis');
jest.mock('@/lib/cache/memory-cache');

describe('Cache System', () => {
  const testKey = 'test:key:123';
  const testData = { 
    result: 'success', 
    data: { id: 1, name: 'Test' },
    timestamp: Date.now() 
  };
  const ttl = 3600; // 1 hour

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module to test different initialization scenarios
    jest.resetModules();
  });

  describe('Redis Cache', () => {
    let mockRedisInstance: jest.Mocked<Redis>;

    beforeEach(() => {
      // Setup Redis mock
      mockRedisInstance = {
        get: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
        ping: jest.fn().mockResolvedValue('PONG'),
      } as any;

      (Redis as unknown as jest.Mock).mockImplementation(() => mockRedisInstance);
      
      // Set Redis URL to use Redis
      process.env.REDIS_URL = 'redis://localhost:6379';
    });

    it('should get cached data from Redis', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(testData));

      const cache = require('@/lib/cache');
      const result = await cache.getCachedResult(testKey);

      expect(result).toEqual(testData);
      expect(mockRedisInstance.get).toHaveBeenCalledWith(testKey);
    });

    it('should set cached data in Redis', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');

      const cache = require('@/lib/cache');
      await cache.setCachedResult(testKey, testData, ttl);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        testKey,
        ttl,
        JSON.stringify(testData)
      );
    });

    it('should return null for non-existent keys', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const cache = require('@/lib/cache');
      const result = await cache.getCachedResult(testKey);

      expect(result).toBeNull();
    });

    it('should handle Redis connection errors and fall back to memory', async () => {
      // Make Redis constructor throw error
      (Redis as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const cache = require('@/lib/cache');
      
      // Should not throw, should use MemoryCache instead
      expect(() => cache).not.toThrow();
    });

    it('should invalidate cache by deleting key', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      const cache = require('@/lib/cache');
      await cache.invalidateCache(testKey);

      expect(mockRedisInstance.del).toHaveBeenCalledWith(testKey);
    });
  });

  describe('Memory Cache Fallback', () => {
    let mockMemoryCacheInstance: jest.Mocked<MemoryCache>;

    beforeEach(() => {
      // Setup MemoryCache mock
      mockMemoryCacheInstance = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      } as any;

      (MemoryCache as jest.Mock).mockImplementation(() => mockMemoryCacheInstance);
      
      // Set REDIS_URL to 'memory' to force memory cache
      process.env.REDIS_URL = 'memory';
    });

    it('should use MemoryCache when REDIS_URL is "memory"', async () => {
      mockMemoryCacheInstance.get.mockResolvedValue(testData);

      const cache = require('@/lib/cache');
      const result = await cache.getCachedResult(testKey);

      expect(result).toEqual(testData);
      expect(mockMemoryCacheInstance.get).toHaveBeenCalledWith(testKey);
      expect(Redis).not.toHaveBeenCalled();
    });

    it('should set data in MemoryCache', async () => {
      const cache = require('@/lib/cache');
      await cache.setCachedResult(testKey, testData, ttl);

      expect(mockMemoryCacheInstance.set).toHaveBeenCalledWith(
        testKey,
        testData,
        ttl
      );
    });

    it('should handle null values in MemoryCache', async () => {
      mockMemoryCacheInstance.get.mockResolvedValue(null);

      const cache = require('@/lib/cache');
      const result = await cache.getCachedResult(testKey);

      expect(result).toBeNull();
    });

    it('should invalidate memory cache entries', async () => {
      const cache = require('@/lib/cache');
      await cache.invalidateCache(testKey);

      expect(mockMemoryCacheInstance.delete).toHaveBeenCalledWith(testKey);
    });
  });

  describe('Cache Key Generation', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'memory';
    });

    it('should generate consistent cache keys', () => {
      const cache = require('@/lib/cache');
      
      // Test opportunity search cache key
      const opportunityKey = cache.generateCacheKey('opportunity', {
        keywords: 'data entry',
        location: 'New York',
      });

      expect(opportunityKey).toMatch(/^opportunity:/);
      expect(opportunityKey).toContain('data-entry');
      expect(opportunityKey).toContain('new-york');
    });

    it('should handle special characters in cache keys', () => {
      const cache = require('@/lib/cache');
      
      const key = cache.generateCacheKey('test', {
        param: 'test@#$%^&*()_+',
      });

      expect(key).toMatch(/^test:/);
      expect(key).not.toContain('@');
      expect(key).not.toContain('#');
    });
  });

  describe('Cache Performance', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'memory';
    });

    it('should handle concurrent cache operations', async () => {
      const mockMemoryCacheInstance = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
      } as any;

      (MemoryCache as jest.Mock).mockImplementation(() => mockMemoryCacheInstance);

      const cache = require('@/lib/cache');
      
      // Simulate concurrent operations
      const operations = Array(10).fill(null).map((_, i) => 
        cache.setCachedResult(`concurrent:${i}`, { data: i }, 60)
      );

      await Promise.all(operations);

      expect(mockMemoryCacheInstance.set).toHaveBeenCalledTimes(10);
    });

    it('should handle large data caching', async () => {
      const largeData = {
        companies: Array(100).fill(null).map((_, i) => ({
          id: i,
          name: `Company ${i}`,
          data: 'x'.repeat(1000), // 1KB per company
        })),
      };

      const mockMemoryCacheInstance = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
      } as any;

      (MemoryCache as jest.Mock).mockImplementation(() => mockMemoryCacheInstance);

      const cache = require('@/lib/cache');
      await cache.setCachedResult('large:data', largeData, 300);

      expect(mockMemoryCacheInstance.set).toHaveBeenCalledWith(
        'large:data',
        largeData,
        300
      );
    });
  });
});