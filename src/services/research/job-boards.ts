import { JobPosting } from '@/types';
import { ExternalServiceError } from '@/lib/errors';
import { searchJobBoardsReal } from '../scraper/job-boards-real';

interface JobSearchParams {
  keywords: string;
  location?: string;
  limit?: number;
}

// Job board sources
const JOB_BOARDS = [
  'indeed',
  'linkedin',
  'glassdoor',
  'ziprecruiter',
  'monster',
  'careerbuilder',
  'simplyhired',
  'angellist',
  'dice',
  'stackoverflow',
  'remoteok',
  'weworkremotely'
];

export async function searchJobBoards(params: JobSearchParams): Promise<JobPosting[]> {
  const { keywords, location, limit = 100 } = params;
  
  try {
    // Use real job board scraping if environment is configured
    if (process.env.USE_REAL_SCRAPING === 'true') {
      return await searchJobBoardsReal(
        keywords, 
        location || 'United States',
        JOB_BOARDS,
        Math.ceil(limit / JOB_BOARDS.length)
      );
    }
    
    // Fallback to mock implementation for testing
    console.log('Using mock job board data. Set USE_REAL_SCRAPING=true for real data.');
    const results: JobPosting[] = [];
    
    // Search each job board
    const boardPromises = JOB_BOARDS.map(board => 
      searchSingleBoard(board, keywords, location, Math.ceil(limit / JOB_BOARDS.length))
    );
    
    const boardResults = await Promise.allSettled(boardPromises);
    
    // Collect successful results
    boardResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      } else {
        console.error(`Failed to search ${JOB_BOARDS[index]}:`, result.reason);
      }
    });
    
    // Deduplicate by title and company
    const unique = deduplicateJobs(results);
    
    // Sort by relevance and recency
    const sorted = sortJobsByRelevance(unique, keywords);
    
    // Return limited results
    return sorted.slice(0, limit);
  } catch (error) {
    throw new ExternalServiceError('Job Board Search', error as Error);
  }
}

async function searchSingleBoard(
  board: string, 
  keywords: string, 
  location?: string,
  limit: number = 10
): Promise<JobPosting[]> {
  // In production, each board would have its own API integration
  // Mock implementation for structure
  
  const mockJobs: JobPosting[] = [];
  
  // Generate mock jobs based on board type
  const boardSpecificRoles = {
    indeed: ['Data Entry Specialist', 'Operations Coordinator', 'Customer Service Rep'],
    linkedin: ['Business Analyst', 'Project Manager', 'Sales Operations'],
    glassdoor: ['HR Coordinator', 'Finance Analyst', 'Marketing Specialist'],
    ziprecruiter: ['Administrative Assistant', 'Account Manager', 'Support Specialist'],
    monster: ['Office Manager', 'Logistics Coordinator', 'Quality Analyst'],
    careerbuilder: ['Inventory Specialist', 'Compliance Officer', 'Process Analyst'],
    simplyhired: ['Bookkeeper', 'Dispatcher', 'Claims Processor'],
    angellist: ['Growth Analyst', 'Operations Manager', 'Customer Success'],
    dice: ['Technical Support', 'Systems Analyst', 'Database Administrator'],
    stackoverflow: ['DevOps Engineer', 'Backend Developer', 'Data Engineer'],
    remoteok: ['Remote Support', 'Virtual Assistant', 'Content Moderator'],
    weworkremotely: ['Remote Coordinator', 'Online Support', 'Digital Analyst']
  };
  
  const roles = boardSpecificRoles[board as keyof typeof boardSpecificRoles] || ['Specialist'];
  
  // Create mock jobs
  for (let i = 0; i < Math.min(limit, 3); i++) {
    mockJobs.push({
      title: roles[i % roles.length],
      company: `Company ${Math.floor(Math.random() * 100)}`,
      url: `https://${board}.com/job/${Math.random().toString(36).substr(2, 9)}`,
      location: location || 'Remote',
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      source: board
    });
  }
  
  return mockJobs;
}

function deduplicateJobs(jobs: JobPosting[]): JobPosting[] {
  const seen = new Set<string>();
  const unique: JobPosting[] = [];
  
  jobs.forEach(job => {
    const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(job);
    }
  });
  
  return unique;
}

function sortJobsByRelevance(jobs: JobPosting[], keywords: string): JobPosting[] {
  const keywordList = keywords.toLowerCase().split(' ');
  
  return jobs.sort((a, b) => {
    // Calculate relevance scores
    const scoreA = calculateRelevanceScore(a, keywordList);
    const scoreB = calculateRelevanceScore(b, keywordList);
    
    // Sort by relevance, then by date
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    
    // Sort by date (newer first)
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });
}

function calculateRelevanceScore(job: JobPosting, keywords: string[]): number {
  let score = 0;
  const title = job.title.toLowerCase();
  const location = (job.location || '').toLowerCase();
  
  keywords.forEach(keyword => {
    if (title.includes(keyword)) score += 2;
    if (location.includes(keyword)) score += 1;
  });
  
  // Boost score for certain high-value indicators
  const highValueTerms = ['data entry', 'manual', 'repetitive', 'coordinator', 'specialist'];
  highValueTerms.forEach(term => {
    if (title.includes(term)) score += 1;
  });
  
  return score;
}