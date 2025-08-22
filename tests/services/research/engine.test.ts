import { ResearchEngine } from '@/services/research/engine';
import { searchJobBoards } from '@/services/research/job-boards';
import { collectOSINT } from '@/services/research/osint';
import { runHorsemenAnalysis } from '@/services/research/horsemen';
import { getCachedResult, setCachedResult } from '@/lib/cache';
import { checkRateLimit, incrementConcurrent, decrementConcurrent } from '@/lib/rate-limit';
import { sampleResearchResults, mockApiResponses } from '../../fixtures';

// Mock dependencies
jest.mock('@/services/research/job-boards');
jest.mock('@/services/research/osint');
jest.mock('@/services/research/horsemen');
jest.mock('@/lib/cache');
jest.mock('@/lib/rate-limit');
jest.mock('@/lib/supabase');

describe('ResearchEngine', () => {
  let engine: ResearchEngine;

  beforeEach(() => {
    engine = new ResearchEngine();
    
    // Setup default mocks
    (getCachedResult as jest.Mock).mockResolvedValue(null);
    (setCachedResult as jest.Mock).mockResolvedValue(undefined);
    (checkRateLimit as jest.Mock).mockResolvedValue(true);
    (incrementConcurrent as jest.Mock).mockResolvedValue(undefined);
    (decrementConcurrent as jest.Mock).mockResolvedValue(undefined);
  });

  describe('searchOpportunities', () => {
    const validRequest = {
      keywords: 'data entry manual process',
      location: 'New York',
      notes: 'Focus on finance sector',
      clientId: 'test-client-id',
    };

    it('should successfully search for opportunities', async () => {
      // Mock job board search
      (searchJobBoards as jest.Mock).mockResolvedValue({
        totalJobs: 25,
        topCompanies: [
          { name: 'Acme Corp', url: 'https://acmecorp.com', jobCount: 3 },
          { name: 'Tech Solutions', url: 'https://techsolutions.com', jobCount: 2 },
        ],
      });

      // Mock OSINT collection
      (collectOSINT as jest.Mock).mockResolvedValue({
        news: ['Company growth news'],
        social: ['Social media posts'],
        tech: ['Tech stack info'],
      });

      // Mock Horsemen analysis
      (runHorsemenAnalysis as jest.Mock).mockResolvedValue({
        automationScore: 8.5,
        confidence: 0.85,
        opportunities: ['Invoice automation', 'Data entry automation'],
        synthesis: 'High potential for automation',
      });

      const result = await engine.searchOpportunities(validRequest);

      expect(result).toMatchObject({
        query: validRequest,
        totalJobsFound: 25,
        companiesAnalyzed: 2,
        opportunities: expect.arrayContaining([
          expect.objectContaining({
            company: expect.objectContaining({ name: 'Acme Corp' }),
            automationScore: 8.5,
            confidence: 0.85,
          }),
        ]),
      });

      // Verify rate limiting was checked
      expect(checkRateLimit).toHaveBeenCalledWith(validRequest.clientId);
      expect(incrementConcurrent).toHaveBeenCalledWith(validRequest.clientId);
      expect(decrementConcurrent).toHaveBeenCalledWith(validRequest.clientId);
    });

    it('should return cached results when available', async () => {
      const cachedResult = sampleResearchResults.opportunitySearch.results;
      (getCachedResult as jest.Mock).mockResolvedValue(cachedResult);

      const result = await engine.searchOpportunities(validRequest);

      expect(result).toEqual(cachedResult);
      expect(searchJobBoards).not.toHaveBeenCalled();
      expect(collectOSINT).not.toHaveBeenCalled();
      expect(runHorsemenAnalysis).not.toHaveBeenCalled();
    });

    it('should throw error when rate limit exceeded', async () => {
      (checkRateLimit as jest.Mock).mockResolvedValue(false);

      await expect(engine.searchOpportunities(validRequest))
        .rejects.toThrow('Rate limit exceeded');

      expect(incrementConcurrent).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (searchJobBoards as jest.Mock).mockRejectedValue(new Error('API error'));

      await expect(engine.searchOpportunities(validRequest))
        .rejects.toThrow('API error');

      // Ensure cleanup happens even on error
      expect(decrementConcurrent).toHaveBeenCalledWith(validRequest.clientId);
    });
  });

  describe('runDeepResearch', () => {
    const validRequest = {
      companyName: 'Acme Corp',
      companyUrl: 'https://acmecorp.com',
      notes: 'Interested in operations automation',
      clientId: 'test-client-id',
    };

    it('should successfully run deep research on a company', async () => {
      // Mock OSINT collection
      (collectOSINT as jest.Mock).mockResolvedValue({
        news: ['Acme Corp expansion news'],
        social: ['CEO discussing efficiency'],
        tech: ['Using Excel, QuickBooks'],
        jobPostings: ['Data entry positions'],
      });

      // Mock Horsemen analysis
      (runHorsemenAnalysis as jest.Mock).mockResolvedValue({
        automationScore: 8.5,
        confidence: 0.85,
        opportunities: [
          'Invoice processing automation',
          'Data workflow automation',
        ],
        synthesis: 'Excellent automation candidate',
        detailedAnalysis: {
          brody: { score: 8, findings: ['Manual processes'] },
          karen: { score: 9, findings: ['B2B focus'] },
          durin: { score: 8, findings: ['Legacy systems'] },
          kevin: { score: 8.5, findings: ['Verified needs'] },
          pinko: { score: 8.5, findings: ['High ROI'] },
        },
      });

      const result = await engine.runDeepResearch(validRequest);

      expect(result).toMatchObject({
        company: {
          name: validRequest.companyName,
          url: validRequest.companyUrl,
        },
        automationAnalysis: {
          score: 8.5,
          confidence: 0.85,
          opportunities: expect.arrayContaining([
            expect.stringContaining('automation'),
          ]),
        },
      });

      // Verify OSINT was collected
      expect(collectOSINT).toHaveBeenCalledWith(
        validRequest.companyName,
        validRequest.companyUrl
      );
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        companyName: '', // Empty name
        companyUrl: 'not-a-url', // Invalid URL
        clientId: 'test-client-id',
      };

      await expect(engine.runDeepResearch(invalidRequest as any))
        .rejects.toThrow();
    });

    it('should cache results after successful research', async () => {
      (collectOSINT as jest.Mock).mockResolvedValue({});
      (runHorsemenAnalysis as jest.Mock).mockResolvedValue({
        automationScore: 7,
        confidence: 0.7,
        opportunities: [],
        synthesis: 'Some potential',
      });

      await engine.runDeepResearch(validRequest);

      expect(setCachedResult).toHaveBeenCalledWith(
        expect.stringContaining('deep:'),
        expect.any(Object),
        expect.any(Number)
      );
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle network timeouts', async () => {
      (searchJobBoards as jest.Mock).mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      await expect(engine.searchOpportunities({
        keywords: 'test',
        clientId: 'test-client-id',
      })).rejects.toThrow('Timeout');
    });

    it('should handle malformed API responses', async () => {
      (searchJobBoards as jest.Mock).mockResolvedValue({
        // Missing required fields
        topCompanies: null,
      });

      await expect(engine.searchOpportunities({
        keywords: 'test',
        clientId: 'test-client-id',
      })).rejects.toThrow();
    });

    it('should sanitize user input', async () => {
      const maliciousRequest = {
        keywords: '<script>alert("xss")</script>',
        location: 'New York"; DROP TABLE companies;--',
        clientId: 'test-client-id',
      };

      (searchJobBoards as jest.Mock).mockResolvedValue({
        totalJobs: 0,
        topCompanies: [],
      });

      await engine.searchOpportunities(maliciousRequest);

      // Verify sanitized input was used
      expect(searchJobBoards).toHaveBeenCalledWith(
        expect.not.stringContaining('<script>'),
        expect.any(String)
      );
    });
  });
});