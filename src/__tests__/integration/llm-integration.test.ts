import { createLLMProvider, LocalLLMProvider } from '@/lib/llm';
import { brodyPassEnhanced, karenPassEnhanced } from '@/services/research/horsemen/llm-enhanced';
import { OsintContext } from '@/types';

describe('LLM Integration Tests', () => {
  describe('LocalLLMProvider', () => {
    it('should create local LLM provider with correct config', () => {
      const provider = createLLMProvider({
        provider: 'local',
        endpoint: 'http://localhost:11434/v1',
        model: 'oss-120b'
      });

      expect(provider).toBeInstanceOf(LocalLLMProvider);
    });

    it('should handle local LLM requests', async () => {
      // Mock fetch for local LLM
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Analysis: The company shows high potential for automation in data entry processes.'
            }
          }]
        })
      });

      const provider = new LocalLLMProvider({
        provider: 'local',
        endpoint: 'http://localhost:11434/v1',
        model: 'oss-120b'
      });

      const context: OsintContext = {
        companyName: 'TestCorp',
        domain: 'testcorp.com',
        homepageUrl: 'https://testcorp.com',
        corp: null,
        news: [],
        jobs: [],
        tech: [],
        social: [],
        procurement: [],
        archives: [],
        evidence: []
      };

      const result = await provider.analyzeContext(context, 'Analyze automation opportunities');
      
      expect(result).toContain('automation');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('oss-120b')
        })
      );
    });

    it('should extract findings from LLM response', async () => {
      const provider = new LocalLLMProvider({
        provider: 'local',
        endpoint: 'http://localhost:11434/v1',
        model: 'oss-120b'
      });

      const analysis = `
        Finding 1: Manual Data Entry Bottleneck
        The company processes over 5000 invoices monthly through manual data entry.
        Confidence: 0.85
        Tags: automation-opportunity, high-impact
        
        Finding 2: Legacy System Integration
        Multiple disconnected systems require manual data transfer.
        Confidence: 0.7
        Tags: integration, tech-debt
      `;

      const findings = await provider.extractFindings(analysis);
      
      expect(findings).toHaveLength(2);
      expect(findings[0]).toMatchObject({
        title: expect.stringContaining('Manual Data Entry'),
        confidence: 0.85,
        tags: expect.arrayContaining(['automation-opportunity', 'high-impact'])
      });
      expect(findings[1]).toMatchObject({
        title: expect.stringContaining('Legacy System'),
        confidence: 0.7,
        tags: expect.arrayContaining(['integration', 'tech-debt'])
      });
    });
  });

  describe('Enhanced Horsemen Passes', () => {
    beforeEach(() => {
      process.env.LLM_PROVIDER = 'local';
      process.env.LOCAL_LLM_ENDPOINT = 'http://localhost:11434/v1';
      process.env.LOCAL_LLM_MODEL = 'oss-120b';

      // Mock LLM responses
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: `
                Finding: High-Volume Manual Processing
                The job postings indicate significant manual data processing needs.
                Confidence: 0.8
                Tags: automation-opportunity, data-entry
              `
            }
          }]
        })
      });
    });

    it('should enhance Brody pass with LLM analysis', async () => {
      const context: OsintContext = {
        companyName: 'DataCorp',
        domain: 'datacorp.com',
        homepageUrl: 'https://datacorp.com',
        corp: null,
        news: [],
        jobs: [
          {
            title: 'Data Entry Specialist',
            company: 'DataCorp',
            url: 'https://datacorp.com/jobs/1',
            location: 'Remote',
            text: 'Process customer orders and invoices'
          },
          {
            title: 'Operations Coordinator',
            company: 'DataCorp',
            url: 'https://datacorp.com/jobs/2',
            location: 'Remote',
            text: 'Coordinate between departments'
          }
        ],
        tech: [
          { name: 'Excel', category: 'Productivity' },
          { name: 'QuickBooks', category: 'Accounting' }
        ],
        social: [],
        procurement: [],
        archives: [],
        evidence: []
      };

      const findings = await brodyPassEnhanced(context);
      
      expect(findings).toBeDefined();
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].tags).toContain('brody-pass');
      
      // Verify LLM was called with proper context
      expect(global.fetch).toHaveBeenCalled();
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].body).toContain('DataCorp');
      expect(fetchCall[1].body).toContain('Data Entry Specialist');
    });

    it('should enhance Karen pass with business analysis', async () => {
      const context: OsintContext = {
        companyName: 'GrowthCorp',
        domain: 'growthcorp.com',
        homepageUrl: 'https://growthcorp.com',
        corp: {
          name: 'GrowthCorp',
          industry: 'E-commerce',
          employees: '100-500',
          domain: 'growthcorp.com',
          founded: null,
          revenue: null
        },
        news: [
          {
            title: 'GrowthCorp Raises $10M Series A',
            url: 'https://news.com/growthcorp',
            date: '2024-01-01',
            source: 'TechNews',
            summary: 'Funding to expand operations',
            sentiment: null
          }
        ],
        jobs: [],
        tech: [],
        social: [
          {
            platform: 'linkedin',
            url: 'https://linkedin.com/company/growthcorp',
            followers: 2500,
            engagement: null,
            lastPost: null,
            metrics: {}
          }
        ],
        procurement: [],
        archives: [],
        evidence: []
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: `
                Finding: Rapid Growth Scaling Challenges
                Recent funding and employee count indicate rapid growth requiring scalable processes.
                Confidence: 0.85
                Tags: growth, scaling, high-impact
              `
            }
          }]
        })
      });

      const findings = await karenPassEnhanced(context);
      
      expect(findings).toBeDefined();
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].tags).toContain('karen-pass');
      
      // Verify business context was analyzed
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].body).toContain('E-commerce');
      expect(fetchCall[1].body).toContain('Series A');
      expect(fetchCall[1].body).toContain('100-500');
    });
  });

  describe('Fallback Behavior', () => {
    it('should fall back to pattern matching when LLM fails', async () => {
      process.env.LLM_PROVIDER = 'local';
      
      // Mock LLM failure
      global.fetch = jest.fn().mockRejectedValue(new Error('LLM service unavailable'));

      const context: OsintContext = {
        companyName: 'FallbackCorp',
        domain: 'fallbackcorp.com',
        homepageUrl: 'https://fallbackcorp.com',
        corp: null,
        news: [],
        jobs: [
          {
            title: 'Data Entry Clerk',
            company: 'FallbackCorp',
            url: 'https://fallbackcorp.com/jobs/1',
            location: 'Remote'
          }
        ],
        tech: [],
        social: [],
        procurement: [],
        archives: [],
        evidence: []
      };

      // This should not throw, but fall back to pattern matching
      const { brodyPass } = await import('@/services/research/horsemen');
      const findings = await brodyPass(context);
      
      expect(findings).toBeDefined();
      expect(findings.length).toBeGreaterThan(0);
      // Should still find data entry opportunity through pattern matching
      expect(findings.some(f => f.tags.includes('automation-opportunity'))).toBe(true);
    });
  });
});