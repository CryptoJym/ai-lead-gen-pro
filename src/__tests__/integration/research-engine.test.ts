import { searchOpportunities, runDeepResearch } from '@/services/research/engine';
import { collectOsintContext } from '@/services/research/osint';
import { searchJobBoards } from '@/services/research/job-boards';
import * as horsemen from '@/services/research/horsemen';
import { getLLMProvider } from '@/lib/llm';

// Mock dependencies
jest.mock('@/services/research/osint');
jest.mock('@/services/research/job-boards');
jest.mock('@/lib/llm');

describe('Research Engine Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.USE_REAL_SCRAPING = 'false'; // Use mocks for testing
    process.env.LLM_PROVIDER = 'local';
  });

  describe('searchOpportunities', () => {
    it('should search job boards and analyze top companies', async () => {
      // Mock job board results
      const mockJobs = [
        {
          title: 'Data Entry Specialist',
          company: 'TechCorp',
          url: 'https://techcorp.com/jobs/123',
          location: 'Remote',
          date: '2024-01-15',
          source: 'indeed'
        },
        {
          title: 'Operations Coordinator',
          company: 'TechCorp',
          url: 'https://techcorp.com/jobs/124',
          location: 'Remote',
          date: '2024-01-16',
          source: 'linkedin'
        },
        {
          title: 'Customer Service Rep',
          company: 'ServiceCo',
          url: 'https://serviceco.com/jobs/456',
          location: 'New York',
          date: '2024-01-14',
          source: 'glassdoor'
        }
      ];

      (searchJobBoards as jest.Mock).mockResolvedValue(mockJobs);

      // Mock OSINT collection
      (collectOsintContext as jest.Mock).mockResolvedValue({
        companyName: 'TechCorp',
        domain: 'techcorp.com',
        homepageUrl: 'https://techcorp.com',
        corp: { name: 'TechCorp', industry: 'Technology' },
        news: [],
        jobs: mockJobs.filter(j => j.company === 'TechCorp'),
        tech: [{ name: 'React', category: 'Frontend' }],
        social: [],
        procurement: [],
        archives: [],
        evidence: []
      });

      const result = await searchOpportunities({
        keywords: 'data entry automation',
        location: 'Remote'
      });

      expect(result).toBeDefined();
      expect(result.findings).toHaveLength(2); // TechCorp and ServiceCo
      expect(result.findings[0].company).toBe('TechCorp');
      expect(result.findings[0].jobs).toHaveLength(2);
      expect(result.summary).toContain('3 job postings across 2 companies');
    });

    it('should handle errors gracefully', async () => {
      (searchJobBoards as jest.Mock).mockRejectedValue(new Error('API error'));

      await expect(searchOpportunities({
        keywords: 'test'
      })).rejects.toThrow();
    });
  });

  describe('runDeepResearch', () => {
    it('should collect OSINT data and run Horsemen analysis', async () => {
      const mockContext = {
        companyName: 'TestCorp',
        domain: 'testcorp.com',
        homepageUrl: 'https://testcorp.com',
        corp: {
          name: 'TestCorp',
          industry: 'E-commerce',
          employees: '500-1000'
        },
        news: [
          {
            title: 'TestCorp raises $50M Series B',
            url: 'https://news.com/testcorp-funding',
            date: '2024-01-10',
            source: 'TechCrunch'
          }
        ],
        jobs: [
          {
            title: 'Operations Manager',
            company: 'TestCorp',
            url: 'https://testcorp.com/careers/ops',
            location: 'San Francisco',
            date: '2024-01-15'
          }
        ],
        tech: [
          { name: 'React', category: 'Frontend' },
          { name: 'Node.js', category: 'Backend' },
          { name: 'PostgreSQL', category: 'Database' }
        ],
        social: [
          {
            platform: 'linkedin',
            url: 'https://linkedin.com/company/testcorp',
            followers: 5000
          }
        ],
        procurement: [],
        archives: [],
        evidence: []
      };

      (collectOsintContext as jest.Mock).mockResolvedValue(mockContext);

      // Mock LLM provider
      const mockLLM = {
        analyzeContext: jest.fn().mockResolvedValue('AI analysis result'),
        extractFindings: jest.fn().mockResolvedValue([
          {
            title: 'High Manual Data Entry Volume',
            detail: 'Company processes over 10,000 orders daily with manual entry',
            confidence: 0.85,
            tags: ['automation-opportunity', 'high-impact'],
            sources: [{ title: 'Job posting analysis' }]
          }
        ])
      };

      (getLLMProvider as jest.Mock).mockReturnValue(mockLLM);

      const result = await runDeepResearch({
        companyName: 'TestCorp',
        companyUrl: 'https://testcorp.com',
        notes: 'Focus on e-commerce automation'
      });

      expect(result).toBeDefined();
      expect(result.model).toBe('horsemen');
      expect(result.findings).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
      expect(collectOsintContext).toHaveBeenCalledWith({
        companyName: 'TestCorp',
        domain: 'https://testcorp.com',
        homepageUrl: 'https://testcorp.com'
      });
    });

    it('should work without LLM using pattern matching', async () => {
      process.env.LLM_PROVIDER = ''; // Disable LLM

      const mockContext = {
        companyName: 'TestCorp',
        domain: 'testcorp.com',
        homepageUrl: 'https://testcorp.com',
        corp: { name: 'TestCorp' },
        news: [],
        jobs: [
          {
            title: 'Data Entry Specialist',
            company: 'TestCorp',
            text: 'Looking for someone to handle high-volume data entry'
          }
        ],
        tech: [],
        social: [],
        procurement: [],
        archives: [],
        evidence: []
      };

      (collectOsintContext as jest.Mock).mockResolvedValue(mockContext);

      const result = await runDeepResearch({
        companyName: 'TestCorp'
      });

      expect(result).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
      // Should find data entry automation opportunity
      const dataEntryFinding = result.findings.find(f => 
        f.title.toLowerCase().includes('data entry')
      );
      expect(dataEntryFinding).toBeDefined();
    });
  });

  describe('Horsemen Analysis Pattern', () => {
    const mockContext = {
      companyName: 'AnalysisCorp',
      domain: 'analysiscorp.com',
      jobs: [
        { title: 'Data Entry Clerk', text: 'Manual data entry required' },
        { title: 'Operations Coordinator', text: 'Coordinate between teams' }
      ],
      tech: [
        { name: 'WordPress', category: 'CMS' },
        { name: 'MySQL', category: 'Database' }
      ],
      news: [
        { title: 'AnalysisCorp expands to new markets' }
      ],
      procurement: [
        { agency: 'GSA', amount: 1000000 }
      ]
    };

    it('should run all five passes in order', async () => {
      const brodyFinding = {
        title: 'Manual Data Entry Detected',
        detail: 'Job postings indicate manual data entry',
        confidence: 0.8,
        tags: ['automation-opportunity', 'brody-pass'],
        sources: []
      };

      const karenFinding = {
        title: 'Growing Business Model',
        detail: 'Expansion indicates scaling needs',
        confidence: 0.75,
        tags: ['growth', 'karen-pass'],
        sources: []
      };

      const durinFinding = {
        title: 'Government Contractor',
        detail: 'GSA contracts indicate process maturity',
        confidence: 0.9,
        tags: ['procurement', 'durin-pass'],
        sources: []
      };

      // Mock individual passes
      jest.spyOn(horsemen, 'brodyPass').mockResolvedValue([brodyFinding]);
      jest.spyOn(horsemen, 'karenPass').mockResolvedValue([karenFinding]);
      jest.spyOn(horsemen, 'durinPass').mockResolvedValue([durinFinding]);
      jest.spyOn(horsemen, 'kevinPass').mockImplementation(async (context, findings) => 
        findings.filter(f => f.confidence >= 0.7)
      );
      jest.spyOn(horsemen, 'pinkoPass').mockImplementation(async (context, findings) => [
        ...findings,
        {
          title: 'Overall Automation Assessment',
          detail: 'High potential for automation',
          confidence: 0.85,
          tags: ['synthesis'],
          sources: []
        }
      ]);

      (collectOsintContext as jest.Mock).mockResolvedValue(mockContext);

      const result = await runDeepResearch({
        companyName: 'AnalysisCorp'
      });

      // Verify all passes were called
      expect(horsemen.brodyPass).toHaveBeenCalledWith(mockContext);
      expect(horsemen.karenPass).toHaveBeenCalledWith(mockContext);
      expect(horsemen.durinPass).toHaveBeenCalledWith(mockContext);
      expect(horsemen.kevinPass).toHaveBeenCalled();
      expect(horsemen.pinkoPass).toHaveBeenCalled();

      // Verify findings
      expect(result.findings).toHaveLength(4); // 3 original + 1 synthesis
      expect(result.findings.find(f => f.tags.includes('synthesis'))).toBeDefined();
    });
  });
});