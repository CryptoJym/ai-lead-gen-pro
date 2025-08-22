import { ResearchEngine } from '@/services/research/engine';
import { searchJobBoards } from '@/services/research/job-boards';
import { collectOSINT } from '@/services/research/osint';
import { runHorsemenAnalysis } from '@/services/research/horsemen';
import { getCachedResult, setCachedResult } from '@/lib/cache';
import { checkRateLimit, incrementConcurrent, decrementConcurrent, getRateLimitStatus } from '@/lib/rate-limit';

// Integration tests with mocked external services but real internal logic
describe('End-to-End Integration Tests', () => {
  // Don't mock internal modules for integration tests
  beforeEach(() => {
    // Clear any module cache
    jest.clearAllMocks();
    
    // Set up environment for integration tests
    process.env.NODE_ENV = 'test';
    process.env.REDIS_URL = 'memory'; // Use in-memory implementations
    process.env.DAILY_RESEARCH_CAP_PER_TENANT = '50';
    process.env.MAX_CONCURRENT_RESEARCH_JOBS = '3';
    process.env.ENABLE_CACHE = 'true';
    process.env.ENABLE_MOCK_MODE = 'true';
  });

  describe('Complete Research Flow', () => {
    it('should complete an opportunity search from start to finish', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440000';
      
      // Step 1: Check initial rate limit status
      const initialStatus = await getRateLimitStatus(clientId);
      expect(initialStatus.dailyUsed).toBe(0);
      expect(initialStatus.concurrentUsed).toBe(0);

      // Step 2: Check rate limit allows request
      const allowed = await checkRateLimit(clientId);
      expect(allowed).toBe(true);

      // Step 3: Increment concurrent count
      await incrementConcurrent(clientId);
      
      // Verify concurrent count increased
      const duringStatus = await getRateLimitStatus(clientId);
      expect(duringStatus.dailyUsed).toBe(1);
      expect(duringStatus.concurrentUsed).toBe(1);

      // Step 4: Run actual research (with mocked external APIs)
      const engine = new ResearchEngine();
      
      // Mock external service calls
      jest.spyOn(engine as any, 'searchJobBoards').mockResolvedValue({
        totalJobs: 25,
        topCompanies: [
          { name: 'Test Corp', url: 'https://testcorp.com', jobCount: 5 },
          { name: 'Demo Inc', url: 'https://demoinc.com', jobCount: 3 },
        ],
      });

      jest.spyOn(engine as any, 'collectCompanyOSINT').mockResolvedValue({
        news: ['Company news'],
        social: ['Social posts'],
        tech: ['Tech stack'],
      });

      jest.spyOn(engine as any, 'analyzeCompany').mockResolvedValue({
        automationScore: 8.5,
        confidence: 0.85,
        opportunities: ['Process automation', 'Data integration'],
        synthesis: 'High automation potential',
      });

      const results = await engine.searchOpportunities({
        keywords: 'data entry automation',
        location: 'New York',
        clientId,
      });

      // Step 5: Verify results
      expect(results).toMatchObject({
        totalJobsFound: 25,
        companiesAnalyzed: 2,
        opportunities: expect.arrayContaining([
          expect.objectContaining({
            company: expect.objectContaining({ name: 'Test Corp' }),
            automationScore: expect.any(Number),
            confidence: expect.any(Number),
          }),
        ]),
      });

      // Step 6: Decrement concurrent count
      await decrementConcurrent(clientId);

      // Step 7: Verify final rate limit status
      const finalStatus = await getRateLimitStatus(clientId);
      expect(finalStatus.dailyUsed).toBe(1);
      expect(finalStatus.concurrentUsed).toBe(0);

      // Step 8: Verify result was cached
      const cacheKey = `opportunity:${Buffer.from('data entry automation:New York').toString('base64')}`;
      const cachedResult = await getCachedResult(cacheKey);
      expect(cachedResult).toBeTruthy();
    });

    it('should enforce rate limits across multiple requests', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440001';
      
      // Set very low limits for testing
      process.env.DAILY_RESEARCH_CAP_PER_TENANT = '2';
      process.env.MAX_CONCURRENT_RESEARCH_JOBS = '1';
      
      // Force module reload to pick up new env vars
      jest.resetModules();
      const { checkRateLimit: check, incrementConcurrent: inc, decrementConcurrent: dec } = require('@/lib/rate-limit');

      // First request should succeed
      expect(await check(clientId)).toBe(true);
      await inc(clientId);

      // Second concurrent request should fail
      expect(await check(clientId)).toBe(false);

      // After releasing first request, second should succeed
      await dec(clientId);
      expect(await check(clientId)).toBe(true);
      await inc(clientId);
      await dec(clientId);

      // Third request should fail (daily limit reached)
      expect(await check(clientId)).toBe(false);
    });

    it('should handle cache hits properly', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440002';
      const engine = new ResearchEngine();

      // Mock the research methods
      const searchSpy = jest.spyOn(engine as any, 'searchJobBoards').mockResolvedValue({
        totalJobs: 10,
        topCompanies: [{ name: 'Cached Corp', url: 'https://cached.com', jobCount: 2 }],
      });

      // First request - should hit the research methods
      const query = {
        keywords: 'cache test',
        location: 'San Francisco',
        clientId,
      };

      const result1 = await engine.searchOpportunities(query);
      expect(searchSpy).toHaveBeenCalledTimes(1);

      // Second identical request - should hit cache
      const result2 = await engine.searchOpportunities(query);
      expect(searchSpy).toHaveBeenCalledTimes(1); // Still only called once

      // Results should be identical
      expect(result2).toEqual(result1);
    });
  });

  describe('Error Recovery', () => {
    it('should clean up resources on error', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440003';
      const engine = new ResearchEngine();

      // Check initial state
      const initialStatus = await getRateLimitStatus(clientId);
      expect(initialStatus.concurrentUsed).toBe(0);

      // Mock a failure
      jest.spyOn(engine as any, 'searchJobBoards').mockRejectedValue(
        new Error('API failure')
      );

      // Attempt research
      try {
        await engine.searchOpportunities({
          keywords: 'error test',
          clientId,
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify cleanup happened
      const finalStatus = await getRateLimitStatus(clientId);
      expect(finalStatus.concurrentUsed).toBe(0);
    });

    it('should handle partial analysis failures', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440004';
      const engine = new ResearchEngine();

      // Mock successful job search
      jest.spyOn(engine as any, 'searchJobBoards').mockResolvedValue({
        totalJobs: 20,
        topCompanies: [
          { name: 'Success Corp', url: 'https://success.com', jobCount: 3 },
          { name: 'Fail Corp', url: 'https://fail.com', jobCount: 2 },
        ],
      });

      // Mock OSINT to fail for second company
      let callCount = 0;
      jest.spyOn(engine as any, 'collectCompanyOSINT').mockImplementation(async (company) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('OSINT API failure');
        }
        return {
          news: ['News'],
          social: ['Social'],
          tech: ['Tech'],
        };
      });

      // Mock analysis
      jest.spyOn(engine as any, 'analyzeCompany').mockResolvedValue({
        automationScore: 7,
        confidence: 0.7,
        opportunities: ['Some automation'],
        synthesis: 'Moderate potential',
      });

      const results = await engine.searchOpportunities({
        keywords: 'partial failure test',
        clientId,
      });

      // Should still return results for successful company
      expect(results.companiesAnalyzed).toBe(1);
      expect(results.opportunities).toHaveLength(1);
      expect(results.opportunities[0].company.name).toBe('Success Corp');
    });
  });

  describe('Memory-based Infrastructure', () => {
    it('should work entirely without Redis', async () => {
      // Ensure Redis is not being used
      process.env.REDIS_URL = 'memory';
      jest.resetModules();

      const clientId = '550e8400-e29b-41d4-a716-446655440005';
      
      // Test rate limiting with memory
      const { checkRateLimit, incrementConcurrent, decrementConcurrent, getRateLimitStatus } = require('@/lib/rate-limit');
      
      expect(await checkRateLimit(clientId)).toBe(true);
      await incrementConcurrent(clientId);
      
      const status = await getRateLimitStatus(clientId);
      expect(status.concurrentUsed).toBe(1);
      
      await decrementConcurrent(clientId);
      
      // Test caching with memory
      const { getCachedResult, setCachedResult } = require('@/lib/cache');
      
      const testData = { test: 'data', timestamp: Date.now() };
      await setCachedResult('test:key', testData, 60);
      
      const retrieved = await getCachedResult('test:key');
      expect(retrieved).toEqual(testData);
    });

    it('should handle memory cache expiration', async () => {
      jest.resetModules();
      const { getCachedResult, setCachedResult } = require('@/lib/cache');
      
      // Set with 1 second TTL
      await setCachedResult('expire:test', { value: 'test' }, 1);
      
      // Should exist immediately
      expect(await getCachedResult('expire:test')).toEqual({ value: 'test' });
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be gone
      expect(await getCachedResult('expire:test')).toBeNull();
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      const engine = new ResearchEngine();
      
      // Mock fast responses
      jest.spyOn(engine as any, 'searchJobBoards').mockResolvedValue({
        totalJobs: 5,
        topCompanies: [{ name: 'Fast Corp', url: 'https://fast.com', jobCount: 1 }],
      });
      
      jest.spyOn(engine as any, 'collectCompanyOSINT').mockResolvedValue({
        news: [], social: [], tech: [],
      });
      
      jest.spyOn(engine as any, 'analyzeCompany').mockResolvedValue({
        automationScore: 5,
        confidence: 0.5,
        opportunities: [],
        synthesis: 'Low potential',
      });

      // Run multiple requests concurrently
      const startTime = Date.now();
      const requests = Array(5).fill(null).map((_, i) => 
        engine.searchOpportunities({
          keywords: `concurrent test ${i}`,
          clientId: `550e8400-e29b-41d4-a716-44665544000${i}`,
        })
      );

      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;

      // All should complete
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.totalJobsFound).toBe(5);
      });

      // Should complete reasonably fast (under 1 second for mocked calls)
      expect(duration).toBeLessThan(1000);
    });
  });
});