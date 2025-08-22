import { Company, OsintContext } from '@/types';
import { ExternalServiceError } from '@/lib/errors';
import {
  collectCorporateDataReal,
  collectNewsDataReal,
  collectTechDataReal,
  collectSocialDataReal,
  collectProcurementDataReal,
  collectArchivesDataReal
} from '../osint/collectors';

// OSINT data collection stages
export async function collectOsintContext(company: Company): Promise<OsintContext> {
  const context: OsintContext = {
    companyName: company.name,
    domain: company.domain || '',
    homepageUrl: company.homepageUrl || company.domain || '',
    corp: null,
    news: [],
    jobs: [],
    tech: [],
    social: [],
    procurement: [],
    archives: [],
    evidence: []
  };
  
  try {
    // Check if we should use real data collection
    const useReal = process.env.USE_REAL_SCRAPING === 'true';
    
    // Run all collectors in parallel for efficiency
    const [
      corpData,
      newsData,
      jobsData,
      techData,
      socialData,
      procurementData,
      archivesData
    ] = await Promise.allSettled([
      useReal ? collectCorporateDataReal(company) : collectCorporateData(company),
      useReal ? collectNewsDataReal(company) : collectNewsData(company),
      collectJobsData(company), // This uses job boards which has its own switch
      useReal ? collectTechDataReal(company) : collectTechData(company),
      useReal ? collectSocialDataReal(company) : collectSocialData(company),
      useReal ? collectProcurementDataReal(company) : collectProcurementData(company),
      useReal ? collectArchivesDataReal(company) : collectArchivesData(company)
    ]);
    
    // Process results
    if (corpData.status === 'fulfilled') context.corp = corpData.value;
    if (newsData.status === 'fulfilled') context.news = newsData.value;
    if (jobsData.status === 'fulfilled') context.jobs = jobsData.value;
    if (techData.status === 'fulfilled') context.tech = techData.value;
    if (socialData.status === 'fulfilled') context.social = socialData.value;
    if (procurementData.status === 'fulfilled') context.procurement = procurementData.value;
    if (archivesData.status === 'fulfilled') context.archives = archivesData.value;
    
    // Collect evidence URLs
    context.evidence = extractEvidence(context);
    
    return context;
  } catch (error) {
    throw new ExternalServiceError('OSINT Collection', error as Error);
  }
}

async function collectCorporateData(company: Company): Promise<any> {
  // In production, this would fetch from corporate databases
  // For now, return mock data structure
  return {
    name: company.name,
    domain: company.domain,
    founded: null,
    employees: null,
    revenue: null,
    industry: null
  };
}

async function collectNewsData(company: Company): Promise<OsintContext['news']> {
  // In production, this would search news APIs
  // Mock implementation for structure
  return [];
}

async function collectJobsData(company: Company): Promise<OsintContext['jobs']> {
  // In production, this would search job boards
  // Mock implementation for structure
  return [];
}

async function collectTechData(company: Company): Promise<OsintContext['tech']> {
  // In production, this would check BuiltWith, StackShare, etc.
  // Mock implementation for structure
  return [];
}

async function collectSocialData(company: Company): Promise<OsintContext['social']> {
  // In production, this would check social media platforms
  // Mock implementation for structure
  return [];
}

async function collectProcurementData(company: Company): Promise<OsintContext['procurement']> {
  // In production, this would check government procurement databases
  // Mock implementation for structure
  return [];
}

async function collectArchivesData(company: Company): Promise<OsintContext['archives']> {
  // In production, this would check Wayback Machine
  // Mock implementation for structure
  return [];
}

function extractEvidence(context: OsintContext): OsintContext['evidence'] {
  const evidence: OsintContext['evidence'] = [];
  
  // Collect all unique URLs as evidence
  const urls = new Set<string>();
  
  if (context.homepageUrl) {
    urls.add(context.homepageUrl);
  }
  
  context.news.forEach(item => {
    if (item.url) urls.add(item.url);
  });
  
  context.jobs.forEach(item => {
    if (item.url) urls.add(item.url);
  });
  
  context.social.forEach(item => {
    if (item.url) urls.add(item.url);
  });
  
  context.archives.forEach(item => {
    if (item.url) urls.add(item.url);
    if (item.snapshotUrl) urls.add(item.snapshotUrl);
  });
  
  // Convert to evidence array
  urls.forEach(url => {
    evidence.push({
      url,
      title: extractTitleFromUrl(url)
    });
  });
  
  return evidence;
}

function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const hostname = urlObj.hostname;
    
    if (pathname && pathname !== '/') {
      // Extract last part of path as title
      const parts = pathname.split('/').filter(Boolean);
      return parts[parts.length - 1].replace(/[-_]/g, ' ');
    }
    
    return hostname;
  } catch {
    return url;
  }
}