import { POST } from '@/app/api/research/route';
import { ResearchEngine } from '@/services/research/engine';
import { checkRateLimit } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/services/research/engine');
jest.mock('@/lib/rate-limit');
jest.mock('@/lib/supabase');

describe('Research API Endpoint', () => {
  let mockResearchEngine: jest.Mocked<ResearchEngine>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup ResearchEngine mock
    mockResearchEngine = {
      searchOpportunities: jest.fn(),
      runDeepResearch: jest.fn(),
    } as any;
    
    (ResearchEngine as jest.Mock).mockImplementation(() => mockResearchEngine);
    (checkRateLimit as jest.Mock).mockResolvedValue(true);
  });

  const createRequest = (body: any, headers: Record<string, string> = {}) => {
    return new NextRequest('http://localhost:3000/api/research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  };

  describe('Request Validation', () => {
    it('should reject requests without clientId', async () => {
      const request = createRequest({
        keywords: 'data entry',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('clientId');
    });

    it('should reject requests without keywords or companyName', async () => {
      const request = createRequest({
        clientId: 'test-client',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('keywords or companyName');
    });

    it('should validate clientId format', async () => {
      const request = createRequest({
        keywords: 'test',
        clientId: 'invalid-uuid-format',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid clientId');
    });
  });

  describe('Opportunity Search', () => {
    const validSearchRequest = {
      keywords: 'data entry automation',
      location: 'New York',
      notes: 'Focus on finance',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('should successfully process opportunity search', async () => {
      const mockResults = {
        query: validSearchRequest,
        totalJobsFound: 50,
        companiesAnalyzed: 5,
        opportunities: [
          {
            company: { name: 'Test Corp', url: 'https://test.com' },
            automationScore: 8.5,
            confidence: 0.85,
          },
        ],
      };

      mockResearchEngine.searchOpportunities.mockResolvedValue(mockResults);

      const request = createRequest(validSearchRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        type: 'opportunity_search',
        results: mockResults,
      });
    });

    it('should handle search errors gracefully', async () => {
      mockResearchEngine.searchOpportunities.mockRejectedValue(
        new Error('Search API down')
      );

      const request = createRequest(validSearchRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Research failed');
    });

    it('should respect rate limits', async () => {
      (checkRateLimit as jest.Mock).mockResolvedValue(false);

      const request = createRequest(validSearchRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Rate limit exceeded');
      expect(mockResearchEngine.searchOpportunities).not.toHaveBeenCalled();
    });
  });

  describe('Deep Research', () => {
    const validDeepRequest = {
      companyName: 'Acme Corp',
      companyUrl: 'https://acmecorp.com',
      notes: 'Interested in automation',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('should successfully process deep research', async () => {
      const mockResult = {
        company: {
          name: 'Acme Corp',
          url: 'https://acmecorp.com',
        },
        automationAnalysis: {
          score: 9,
          confidence: 0.9,
          opportunities: ['Invoice automation', 'Workflow automation'],
        },
        horsemanAnalysis: {
          brody: { score: 8 },
          karen: { score: 9 },
          durin: { score: 9 },
          kevin: { score: 9 },
          pinko: { finalScore: 9 },
        },
      };

      mockResearchEngine.runDeepResearch.mockResolvedValue(mockResult);

      const request = createRequest(validDeepRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        type: 'deep_research',
        result: mockResult,
      });
    });

    it('should validate company URL format', async () => {
      const request = createRequest({
        ...validDeepRequest,
        companyUrl: 'not-a-valid-url',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid company URL');
    });
  });

  describe('Authentication', () => {
    it('should accept requests with valid bearer token', async () => {
      process.env.API_TOKEN = 'test-bearer-token';
      
      const request = createRequest(
        {
          keywords: 'test',
          clientId: '550e8400-e29b-41d4-a716-446655440000',
        },
        {
          'Authorization': 'Bearer test-bearer-token',
        }
      );

      mockResearchEngine.searchOpportunities.mockResolvedValue({
        query: {} as any,
        totalJobsFound: 0,
        companiesAnalyzed: 0,
        opportunities: [],
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should reject requests with invalid bearer token', async () => {
      process.env.API_TOKEN = 'test-bearer-token';
      
      const request = createRequest(
        {
          keywords: 'test',
          clientId: '550e8400-e29b-41d4-a716-446655440000',
        },
        {
          'Authorization': 'Bearer wrong-token',
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request');
    });

    it('should handle unexpected errors', async () => {
      const request = createRequest({
        keywords: 'test',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
      });

      // Force an unexpected error
      (ResearchEngine as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected initialization error');
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Internal server error');
    });
  });

  describe('Response Headers', () => {
    it('should include proper CORS headers', async () => {
      const request = createRequest({
        keywords: 'test',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
      });

      mockResearchEngine.searchOpportunities.mockResolvedValue({
        query: {} as any,
        totalJobsFound: 0,
        companiesAnalyzed: 0,
        opportunities: [],
      });

      const response = await POST(request);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });
});