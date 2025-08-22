import { GET } from '@/app/api/status/route';
import { getRateLimitStatus } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';

jest.mock('@/lib/rate-limit');

describe('Status API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (headers: Record<string, string> = {}) => {
    return new NextRequest('http://localhost:3000/api/status', {
      method: 'GET',
      headers,
    });
  };

  describe('Rate Limit Status', () => {
    it('should return rate limit status for valid client', async () => {
      const mockStatus = {
        dailyUsed: 25,
        dailyLimit: 50,
        dailyRemaining: 25,
        concurrentUsed: 1,
        concurrentLimit: 3,
        resetAt: new Date().toISOString(),
      };

      (getRateLimitStatus as jest.Mock).mockResolvedValue(mockStatus);

      const request = createRequest({
        'X-Client-ID': '550e8400-e29b-41d4-a716-446655440000',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        rateLimits: mockStatus,
        health: {
          status: 'healthy',
          cache: expect.any(String),
          timestamp: expect.any(String),
        },
      });
    });

    it('should use default client ID if not provided', async () => {
      process.env.DEFAULT_CLIENT_ID = 'default-client-id';
      
      const mockStatus = {
        dailyUsed: 0,
        dailyLimit: 50,
        dailyRemaining: 50,
        concurrentUsed: 0,
        concurrentLimit: 3,
        resetAt: new Date().toISOString(),
      };

      (getRateLimitStatus as jest.Mock).mockResolvedValue(mockStatus);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(getRateLimitStatus).toHaveBeenCalledWith('default-client-id');
      expect(data.rateLimits).toEqual(mockStatus);
    });

    it('should validate client ID format', async () => {
      const request = createRequest({
        'X-Client-ID': 'invalid-uuid',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid client ID');
    });
  });

  describe('Health Check', () => {
    it('should indicate Redis cache when available', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      jest.resetModules();

      const mockStatus = {
        dailyUsed: 0,
        dailyLimit: 50,
        dailyRemaining: 50,
        concurrentUsed: 0,
        concurrentLimit: 3,
        resetAt: new Date().toISOString(),
      };

      (getRateLimitStatus as jest.Mock).mockResolvedValue(mockStatus);

      const request = createRequest({
        'X-Client-ID': '550e8400-e29b-41d4-a716-446655440000',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.health.cache).toContain('redis');
    });

    it('should indicate memory cache when Redis not available', async () => {
      process.env.REDIS_URL = 'memory';
      jest.resetModules();

      const mockStatus = {
        dailyUsed: 0,
        dailyLimit: 50,
        dailyRemaining: 50,
        concurrentUsed: 0,
        concurrentLimit: 3,
        resetAt: new Date().toISOString(),
      };

      (getRateLimitStatus as jest.Mock).mockResolvedValue(mockStatus);

      const request = createRequest({
        'X-Client-ID': '550e8400-e29b-41d4-a716-446655440000',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.health.cache).toContain('memory');
    });

    it('should include proper timestamp', async () => {
      const beforeTime = new Date();
      
      const mockStatus = {
        dailyUsed: 0,
        dailyLimit: 50,
        dailyRemaining: 50,
        concurrentUsed: 0,
        concurrentLimit: 3,
        resetAt: new Date().toISOString(),
      };

      (getRateLimitStatus as jest.Mock).mockResolvedValue(mockStatus);

      const request = createRequest({
        'X-Client-ID': '550e8400-e29b-41d4-a716-446655440000',
      });

      const response = await GET(request);
      const data = await response.json();
      
      const afterTime = new Date();
      const responseTime = new Date(data.health.timestamp);

      expect(responseTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(responseTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limit service errors', async () => {
      (getRateLimitStatus as jest.Mock).mockRejectedValue(
        new Error('Redis connection failed')
      );

      const request = createRequest({
        'X-Client-ID': '550e8400-e29b-41d4-a716-446655440000',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to get status');
    });

    it('should handle missing environment variables gracefully', async () => {
      delete process.env.DEFAULT_CLIENT_ID;
      
      const request = createRequest(); // No client ID header

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Client ID required');
    });
  });

  describe('Response Format', () => {
    it('should return consistent response structure', async () => {
      const mockStatus = {
        dailyUsed: 10,
        dailyLimit: 50,
        dailyRemaining: 40,
        concurrentUsed: 2,
        concurrentLimit: 3,
        resetAt: '2024-01-20T00:00:00.000Z',
      };

      (getRateLimitStatus as jest.Mock).mockResolvedValue(mockStatus);

      const request = createRequest({
        'X-Client-ID': '550e8400-e29b-41d4-a716-446655440000',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('rateLimits');
      expect(data).toHaveProperty('health');
      expect(data.rateLimits).toHaveProperty('dailyUsed');
      expect(data.rateLimits).toHaveProperty('dailyLimit');
      expect(data.rateLimits).toHaveProperty('dailyRemaining');
      expect(data.rateLimits).toHaveProperty('concurrentUsed');
      expect(data.rateLimits).toHaveProperty('concurrentLimit');
      expect(data.rateLimits).toHaveProperty('resetAt');
      expect(data.health).toHaveProperty('status');
      expect(data.health).toHaveProperty('cache');
      expect(data.health).toHaveProperty('timestamp');
    });
  });
});