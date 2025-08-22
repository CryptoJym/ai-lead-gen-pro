import { ResearchRequest, ResearchResult, Finding, CompanyFindings, JobPosting } from '@/types';
import { ValidationError, ExternalServiceError } from '@/lib/errors';
import { cache, Cacheable } from '@/lib/cache';
import { collectOsintContext } from './osint';
import { searchJobBoards } from './job-boards';
import { synthesizeFindings } from './synthesis';
import * as horsemen from './horsemen';

export async function searchOpportunities(request: ResearchRequest): Promise<ResearchResult> {
  if (!request.keywords) {
    throw new ValidationError('Keywords are required for opportunity search');
  }

  const { keywords, location, notes } = request;
  
  // Check cache first
  const cacheKey = { keywords, location };
  const cached = await cache.get<ResearchResult>('JOB_SEARCH', cacheKey);
  if (cached) {
    return cached;
  }
  
  // Search across multiple job boards
  const jobPostings = await searchJobBoards({ keywords, location });
  
  // Group by company and analyze
  const companiesMap = new Map<string, JobPosting[]>();
  jobPostings.forEach(job => {
    const existing = companiesMap.get(job.company) || [];
    companiesMap.set(job.company, [...existing, job]);
  });

  // Run analysis on top companies
  const topCompanies = Array.from(companiesMap.entries())
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 10);

  const findings: CompanyFindings[] = [];
  
  for (const [company, jobs] of topCompanies) {
    const companyUrl = jobs[0].url ? new URL(jobs[0].url).hostname : undefined;
    const analysis = await runDeepResearch({
      companyName: company,
      companyUrl,
      notes: `${notes || ''} Found ${jobs.length} relevant job postings`
    });
    
    findings.push({
      company,
      jobs,
      research: analysis.findings as Finding[]
    });
  }

  const result: ResearchResult = {
    jobId: request.clientId || 'anonymous',
    model: 'opportunity-search',
    summary: `Found ${jobPostings.length} job postings across ${companiesMap.size} companies. Top ${findings.length} companies analyzed.`,
    findings,
    meta: {
      keywords,
      location,
      notes
    }
  };
  
  // Cache the result
  await cache.set('JOB_SEARCH', cacheKey, result);
  
  return result;
}

export async function runDeepResearch(request: ResearchRequest): Promise<ResearchResult> {
  if (!request.companyName && !request.companyUrl) {
    throw new ValidationError('Either companyName or companyUrl is required');
  }

  const { companyName, companyUrl, notes } = request;
  
  try {
    // Collect OSINT context
    const context = await collectOsintContext({
      name: companyName || '',
      domain: companyUrl || '',
      homepageUrl: companyUrl || ''
    });

    // Run the Horsemen analysis pattern
    const findings = await runHorsemenAnalysis(context, notes);

    return {
      jobId: request.clientId || 'anonymous',
      model: 'horsemen',
      summary: generateSummary(findings),
      findings,
      meta: {
        notes
      }
    };
  } catch (error) {
    throw new ExternalServiceError('Research Engine', error as Error);
  }
}

async function runHorsemenAnalysis(context: any, notes?: string): Promise<Finding[]> {
  // The 5-pass Horsemen pattern
  const brody = await horsemen.brodyPass(context);
  const karen = await horsemen.karenPass(context);
  const durin = await horsemen.durinPass(context);
  
  const preliminary = [...brody, ...karen, ...durin];
  
  // Kevin pass for verification
  const verified = await horsemen.kevinPass(context, preliminary);
  
  // Pinko pass for final synthesis
  const findings = await horsemen.pinkoPass(context, verified);
  
  return findings;
}

function generateSummary(findings: Finding[]): string {
  const highConfidence = findings.filter(f => f.confidence >= 0.8).length;
  const opportunities = findings.filter(f => 
    f.tags.includes('automation-opportunity') || 
    f.tags.includes('high-impact')
  ).length;
  
  return `Analysis complete: ${findings.length} findings (${highConfidence} high confidence). ${opportunities} automation opportunities identified.`;
}