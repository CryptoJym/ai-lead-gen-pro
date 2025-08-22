import { 
  checkRateLimit, 
  incrementConcurrent, 
  decrementConcurrent, 
  getRateLimitStatus 
} from '@/lib/rate-limit';
import { Redis } from 'ioredis';
import { MemoryRateLimiter } from '@/lib/rate-limit/memory-rate-limit';

jest.mock('ioredis');
jest.mock('@/lib/rate-limit/memory-rate-limit');

describe('Rate Limiting System', () => {
  const testClientId = 'test-client-123';
  const today = new Date().toISOString().split('T')[0];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Reset environment variables
    process.env.DAILY_RESEARCH_CAP_PER_TENANT = '50';
    process.env.MAX_CONCURRENT_RESEARCH_JOBS = '3';
  });

  describe('Redis Rate Limiter', () => {
    let mockRedisInstance: jest.Mocked<Redis>;

    beforeEach(() => {
      mockRedisInstance = {
        incr: jest.fn(),
        decr: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
        expire: jest.fn(),
        ping: jest.fn().mockResolvedValue('PONG'),
      } as any;

      (Redis as unknown as jest.Mock).mockImplementation(() => mockRedisInstance);
      process.env.REDIS_URL = 'redis://localhost:6379';
    });

    describe('checkRateLimit', () => {
      it('should allow requests within daily limit', async () => {
        mockRedisInstance.incr.mockResolvedValue(5); // 5th request today
        mockRedisInstance.get.mockResolvedValue(null); // No concurrent jobs

        const rateLimit = require('@/lib/rate-limit');
        const allowed = await rateLimit.checkRateLimit(testClientId);

        expect(allowed).toBe(true);
        expect(mockRedisInstance.incr).toHaveBeenCalledWith(
          `rate:daily:${testClientId}:${today}`
        );
      });

      it('should set expiry on first request of the day', async () => {
        mockRedisInstance.incr.mockResolvedValue(1); // First request
        mockRedisInstance.get.mockResolvedValue(null);
        mockRedisInstance.expire.mockResolvedValue(1);

        const rateLimit = require('@/lib/rate-limit');
        await rateLimit.checkRateLimit(testClientId);

        expect(mockRedisInstance.expire).toHaveBeenCalledWith(
          `rate:daily:${testClientId}:${today}`,
          86400 // 24 hours
        );
      });

      it('should reject requests exceeding daily limit', async () => {
        mockRedisInstance.incr.mockResolvedValue(51); // 51st request (over limit of 50)
        mockRedisInstance.decr.mockResolvedValue(50);

        const rateLimit = require('@/lib/rate-limit');
        const allowed = await rateLimit.checkRateLimit(testClientId);

        expect(allowed).toBe(false);
        expect(mockRedisInstance.decr).toHaveBeenCalled(); // Revert increment
      });

      it('should reject requests exceeding concurrent limit', async () => {
        mockRedisInstance.incr.mockResolvedValue(10); // Daily count OK
        mockRedisInstance.get.mockResolvedValue('3'); // Already at concurrent limit
        mockRedisInstance.decr.mockResolvedValue(9);

        const rateLimit = require('@/lib/rate-limit');
        const allowed = await rateLimit.checkRateLimit(testClientId);

        expect(allowed).toBe(false);
        expect(mockRedisInstance.decr).toHaveBeenCalledWith(
          `rate:daily:${testClientId}:${today}`
        );
      });

      it('should fail open when Redis is down', async () => {
        mockRedisInstance.incr.mockRejectedValue(new Error('Connection lost'));

        const rateLimit = require('@/lib/rate-limit');
        const allowed = await rateLimit.checkRateLimit(testClientId);

        expect(allowed).toBe(true); // Fail open
      });
    });

    describe('Concurrent job tracking', () => {
      it('should increment concurrent count', async () => {
        mockRedisInstance.incr.mockResolvedValue(1);
        mockRedisInstance.expire.mockResolvedValue(1);

        const rateLimit = require('@/lib/rate-limit');
        await rateLimit.incrementConcurrent(testClientId);

        expect(mockRedisInstance.incr).toHaveBeenCalledWith(
          `rate:concurrent:${testClientId}`
        );
        expect(mockRedisInstance.expire).toHaveBeenCalledWith(
          `rate:concurrent:${testClientId}`,
          3600 // 1 hour expiry
        );
      });

      it('should decrement concurrent count', async () => {
        mockRedisInstance.decr.mockResolvedValue(2);

        const rateLimit = require('@/lib/rate-limit');
        await rateLimit.decrementConcurrent(testClientId);

        expect(mockRedisInstance.decr).toHaveBeenCalledWith(
          `rate:concurrent:${testClientId}`
        );
      });

      it('should delete key when count reaches zero', async () => {
        mockRedisInstance.decr.mockResolvedValue(0);
        mockRedisInstance.del.mockResolvedValue(1);

        const rateLimit = require('@/lib/rate-limit');
        await rateLimit.decrementConcurrent(testClientId);

        expect(mockRedisInstance.del).toHaveBeenCalledWith(
          `rate:concurrent:${testClientId}`
        );
      });
    });

    describe('getRateLimitStatus', () => {
      it('should return complete rate limit status', async () => {
        mockRedisInstance.get
          .mockResolvedValueOnce('25') // Daily used
          .mockResolvedValueOnce('2');  // Concurrent used

        const rateLimit = require('@/lib/rate-limit');
        const status = await rateLimit.getRateLimitStatus(testClientId);

        expect(status).toMatchObject({
          dailyUsed: 25,
          dailyLimit: 50,
          dailyRemaining: 25,
          concurrentUsed: 2,
          concurrentLimit: 3,
          resetAt: expect.any(String),
        });

        // Verify reset time is tomorrow at midnight
        const resetDate = new Date(status.resetAt);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        expect(resetDate.toISOString()).toBe(tomorrow.toISOString());
      });

      it('should handle missing values gracefully', async () => {
        mockRedisInstance.get.mockResolvedValue(null);

        const rateLimit = require('@/lib/rate-limit');
        const status = await rateLimit.getRateLimitStatus(testClientId);

        expect(status.dailyUsed).toBe(0);
        expect(status.concurrentUsed).toBe(0);
        expect(status.dailyRemaining).toBe(50);
      });
    });
  });

  describe('Memory Rate Limiter', () => {
    let mockMemoryRateLimiterInstance: jest.Mocked<MemoryRateLimiter>;

    beforeEach(() => {
      mockMemoryRateLimiterInstance = {
        incr: jest.fn(),
        decr: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
        expire: jest.fn(),
      } as any;

      (MemoryRateLimiter as jest.Mock).mockImplementation(() => mockMemoryRateLimiterInstance);
      process.env.REDIS_URL = 'memory';
    });

    it('should use MemoryRateLimiter when REDIS_URL is "memory"', async () => {
      mockMemoryRateLimiterInstance.incr.mockResolvedValue(1);
      mockMemoryRateLimiterInstance.get.mockResolvedValue(null);

      const rateLimit = require('@/lib/rate-limit');
      await rateLimit.checkRateLimit(testClientId);

      expect(mockMemoryRateLimiterInstance.incr).toHaveBeenCalled();
      expect(Redis).not.toHaveBeenCalled();
    });

    it('should enforce rate limits with memory implementation', async () => {
      mockMemoryRateLimiterInstance.incr.mockResolvedValue(51); // Over limit
      mockMemoryRateLimiterInstance.decr.mockResolvedValue(50);

      const rateLimit = require('@/lib/rate-limit');
      const allowed = await rateLimit.checkRateLimit(testClientId);

      expect(allowed).toBe(false);
    });

    it('should track concurrent jobs in memory', async () => {
      mockMemoryRateLimiterInstance.incr.mockResolvedValue(1);
      mockMemoryRateLimiterInstance.expire.mockResolvedValue(undefined);

      const rateLimit = require('@/lib/rate-limit');
      await rateLimit.incrementConcurrent(testClientId);

      expect(mockMemoryRateLimiterInstance.incr).toHaveBeenCalledWith(
        `rate:concurrent:${testClientId}`
      );
    });
  });

  describe('Rate Limit Edge Cases', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'memory';
    });

    it('should handle custom rate limit configuration', async () => {
      process.env.DAILY_RESEARCH_CAP_PER_TENANT = '100';
      process.env.MAX_CONCURRENT_RESEARCH_JOBS = '5';
      
      jest.resetModules();
      
      const mockMemoryRateLimiterInstance = {
        get: jest.fn().mockResolvedValue('80'),
      } as any;
      
      (MemoryRateLimiter as jest.Mock).mockImplementation(() => mockMemoryRateLimiterInstance);

      const rateLimit = require('@/lib/rate-limit');
      const status = await rateLimit.getRateLimitStatus(testClientId);

      expect(status.dailyLimit).toBe(100);
      expect(status.concurrentLimit).toBe(5);
    });

    it('should handle rate limit resets across day boundaries', async () => {
      const mockMemoryRateLimiterInstance = {
        incr: jest.fn().mockResolvedValue(1),
        get: jest.fn().mockResolvedValue(null),
        expire: jest.fn(),
      } as any;

      (MemoryRateLimiter as jest.Mock).mockImplementation(() => mockMemoryRateLimiterInstance);

      const rateLimit = require('@/lib/rate-limit');
      
      // Simulate request at 11:59 PM
      const lateNight = new Date();
      lateNight.setHours(23, 59, 0, 0);
      jest.spyOn(Date, 'now').mockReturnValue(lateNight.getTime());

      await rateLimit.checkRateLimit(testClientId);

      // Should use today's key
      expect(mockMemoryRateLimiterInstance.incr).toHaveBeenCalledWith(
        expect.stringContaining(today)
      );

      // Simulate request at 12:01 AM next day
      const earlyMorning = new Date(lateNight);
      earlyMorning.setDate(earlyMorning.getDate() + 1);
      earlyMorning.setHours(0, 1, 0, 0);
      jest.spyOn(Date, 'now').mockReturnValue(earlyMorning.getTime());

      await rateLimit.checkRateLimit(testClientId);

      // Should use tomorrow's key
      const tomorrow = earlyMorning.toISOString().split('T')[0];
      expect(mockMemoryRateLimiterInstance.incr).toHaveBeenCalledWith(
        expect.stringContaining(tomorrow)
      );
    });
  });
});