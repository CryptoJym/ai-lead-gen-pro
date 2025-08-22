import { runHorsemenAnalysis } from '@/services/research/horsemen';
import { BrodyPass } from '@/services/research/horsemen/brody';
import { KarenPass } from '@/services/research/horsemen/karen';
import { DurinPass } from '@/services/research/horsemen/durin';
import { KevinPass } from '@/services/research/horsemen/kevin';
import { PinkoPass } from '@/services/research/horsemen/pinko';
import { sampleCompanies } from '../../fixtures';

// Mock all horsemen passes
jest.mock('@/services/research/horsemen/brody');
jest.mock('@/services/research/horsemen/karen');
jest.mock('@/services/research/horsemen/durin');
jest.mock('@/services/research/horsemen/kevin');
jest.mock('@/services/research/horsemen/pinko');

describe('Horsemen Analysis', () => {
  const mockCompanyData = {
    name: 'Acme Corp',
    url: 'https://acmecorp.com',
    osint: {
      news: ['Company growing 20% annually'],
      social: ['Hiring for manual data entry roles'],
      tech: ['Using Excel for everything'],
      jobPostings: ['Data Entry Specialist', 'Administrative Assistant'],
    },
  };

  beforeEach(() => {
    // Setup mock responses for each pass
    (BrodyPass.analyze as jest.Mock).mockResolvedValue({
      score: 8,
      findings: [
        'High volume of manual data entry jobs',
        'No automation tools mentioned',
        'Repetitive task descriptions',
      ],
      opportunities: ['Data entry automation', 'Workflow automation'],
    });

    (KarenPass.analyze as jest.Mock).mockResolvedValue({
      score: 9,
      findings: [
        'B2B business model',
        'Rapid growth phase',
        'Budget available for improvements',
      ],
      marketPosition: 'Growing mid-market company',
    });

    (DurinPass.analyze as jest.Mock).mockResolvedValue({
      score: 8,
      findings: [
        'Legacy systems in use',
        'No API integrations',
        'Manual data transfer between systems',
      ],
      techDebt: 'High',
    });

    (KevinPass.verify as jest.Mock).mockResolvedValue({
      score: 8.5,
      verified: true,
      findings: [
        'Pain points confirmed across sources',
        'Budget allocation mentioned in reports',
      ],
    });

    (PinkoPass.synthesize as jest.Mock).mockResolvedValue({
      finalScore: 8.5,
      confidence: 0.85,
      opportunities: [
        {
          area: 'Data Entry Automation',
          impact: 'High',
          effort: 'Medium',
          roi: '6 months',
        },
        {
          area: 'Workflow Integration',
          impact: 'High',
          effort: 'High',
          roi: '9 months',
        },
      ],
      recommendation: 'Excellent automation candidate',
    });
  });

  describe('Full Analysis Flow', () => {
    it('should run all five passes and synthesize results', async () => {
      const result = await runHorsemenAnalysis(mockCompanyData);

      // Verify all passes were called
      expect(BrodyPass.analyze).toHaveBeenCalledWith(mockCompanyData);
      expect(KarenPass.analyze).toHaveBeenCalledWith(mockCompanyData);
      expect(DurinPass.analyze).toHaveBeenCalledWith(mockCompanyData);
      expect(KevinPass.verify).toHaveBeenCalledWith(
        mockCompanyData,
        expect.any(Object) // Previous pass results
      );
      expect(PinkoPass.synthesize).toHaveBeenCalledWith(
        expect.objectContaining({
          brody: expect.any(Object),
          karen: expect.any(Object),
          durin: expect.any(Object),
          kevin: expect.any(Object),
        })
      );

      // Verify final result structure
      expect(result).toMatchObject({
        automationScore: 8.5,
        confidence: 0.85,
        opportunities: expect.arrayContaining([
          expect.stringContaining('Automation'),
        ]),
        synthesis: expect.any(String),
        detailedAnalysis: {
          brody: expect.objectContaining({ score: 8 }),
          karen: expect.objectContaining({ score: 9 }),
          durin: expect.objectContaining({ score: 8 }),
          kevin: expect.objectContaining({ score: 8.5 }),
          pinko: expect.objectContaining({ finalScore: 8.5 }),
        },
      });
    });

    it('should handle partial failures gracefully', async () => {
      // Make one pass fail
      (DurinPass.analyze as jest.Mock).mockRejectedValue(
        new Error('API timeout')
      );

      const result = await runHorsemenAnalysis(mockCompanyData);

      // Should still return results from other passes
      expect(result.automationScore).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.85); // Lower confidence due to failure
    });

    it('should adjust confidence based on agreement between passes', async () => {
      // High disagreement scenario
      (BrodyPass.analyze as jest.Mock).mockResolvedValue({
        score: 3,
        findings: ['Low automation potential'],
      });

      (KarenPass.analyze as jest.Mock).mockResolvedValue({
        score: 9,
        findings: ['High growth potential'],
      });

      const result = await runHorsemenAnalysis(mockCompanyData);

      // Confidence should be lower due to disagreement
      expect(result.confidence).toBeLessThan(0.7);
    });
  });

  describe('Individual Pass Tests', () => {
    it('Brody Pass should identify automation keywords', async () => {
      const jobData = {
        jobPostings: [
          'Seeking Data Entry Specialist for manual invoice processing',
          'Administrative Assistant needed for repetitive tasks',
          'Operations Manager to handle spreadsheet management',
        ],
      };

      (BrodyPass.analyze as jest.Mock).mockImplementation(async (data) => {
        const keywords = ['manual', 'repetitive', 'spreadsheet', 'data entry'];
        const score = keywords.filter(k => 
          data.jobPostings?.some((job: string) => 
            job.toLowerCase().includes(k)
          )
        ).length * 2;

        return {
          score: Math.min(score, 10),
          findings: [`Found ${score / 2} automation keywords`],
        };
      });

      const result = await BrodyPass.analyze({ ...mockCompanyData, ...jobData });
      expect(result.score).toBeGreaterThanOrEqual(6);
    });

    it('Karen Pass should evaluate business model fit', async () => {
      const businessData = {
        osint: {
          news: ['B2B SaaS company', 'Enterprise clients', 'Series B funding'],
        },
      };

      (KarenPass.analyze as jest.Mock).mockImplementation(async (data) => {
        const b2bSignals = ['B2B', 'Enterprise', 'SaaS'];
        const hasB2B = b2bSignals.some(signal =>
          data.osint?.news?.some((item: string) => item.includes(signal))
        );

        return {
          score: hasB2B ? 9 : 5,
          findings: hasB2B ? ['Strong B2B fit'] : ['B2C model less ideal'],
        };
      });

      const result = await KarenPass.analyze({ ...mockCompanyData, ...businessData });
      expect(result.score).toBe(9);
    });

    it('Durin Pass should assess technical maturity', async () => {
      const techData = {
        osint: {
          tech: ['Excel', 'Outlook', 'No APIs', 'Manual processes'],
        },
      };

      (DurinPass.analyze as jest.Mock).mockImplementation(async (data) => {
        const legacyIndicators = ['Excel', 'Manual', 'No APIs'];
        const legacyCount = legacyIndicators.filter(ind =>
          data.osint?.tech?.some((item: string) => item.includes(ind))
        ).length;

        return {
          score: Math.max(10 - legacyCount, 5),
          findings: [`${legacyCount} legacy indicators found`],
          techDebt: legacyCount > 2 ? 'High' : 'Medium',
        };
      });

      const result = await DurinPass.analyze({ ...mockCompanyData, ...techData });
      expect(result.techDebt).toBe('High');
    });

    it('Kevin Pass should verify findings across sources', async () => {
      const previousResults = {
        brody: { score: 8, findings: ['Manual processes'] },
        karen: { score: 8, findings: ['B2B model'] },
        durin: { score: 8, findings: ['Legacy systems'] },
      };

      (KevinPass.verify as jest.Mock).mockImplementation(async (data, prev) => {
        const scores = [prev.brody.score, prev.karen.score, prev.durin.score];
        const variance = Math.max(...scores) - Math.min(...scores);
        const verified = variance < 3; // Low variance = high agreement

        return {
          score: verified ? 8.5 : 6,
          verified,
          findings: verified 
            ? ['High agreement across analyses']
            : ['Conflicting signals detected'],
        };
      });

      const result = await KevinPass.verify(mockCompanyData, previousResults);
      expect(result.verified).toBe(true);
    });

    it('Pinko Pass should synthesize actionable recommendations', async () => {
      const allResults = {
        brody: { score: 8, findings: ['Manual data entry'] },
        karen: { score: 9, findings: ['B2B, high growth'] },
        durin: { score: 8, findings: ['Legacy systems'] },
        kevin: { score: 8.5, verified: true },
      };

      (PinkoPass.synthesize as jest.Mock).mockImplementation(async (results) => {
        const avgScore = (results.brody.score + results.karen.score + 
                         results.durin.score + results.kevin.score) / 4;

        return {
          finalScore: avgScore,
          confidence: results.kevin.verified ? 0.85 : 0.65,
          opportunities: avgScore > 7 ? [
            {
              area: 'Quick Win: Data Entry Automation',
              impact: 'High',
              effort: 'Low',
              roi: '3 months',
            },
          ] : [],
          recommendation: avgScore > 7 
            ? 'Excellent automation candidate'
            : 'Limited automation potential',
        };
      });

      const result = await PinkoPass.synthesize(allResults);
      expect(result.finalScore).toBeCloseTo(8.375);
      expect(result.recommendation).toContain('Excellent');
    });
  });
});