import { chromium, Browser, Page } from 'playwright';
import UserAgent from 'user-agents';
import { JobPosting } from '@/types';
import { ExternalServiceError } from '@/lib/errors';

// Simple rate limiting implementation
const rateLimiter = {
  running: 0,
  max: 3,
  async run<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.max) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
    }
  }
};

interface ScraperConfig {
  headless?: boolean;
  timeout?: number;
  maxRetries?: number;
  userAgent?: string;
}

const defaultConfig: ScraperConfig = {
  headless: true,
  timeout: 30000,
  maxRetries: 3
};

// Job board scraper implementations
export class JobBoardScraper {
  private browser: Browser | null = null;
  private config: ScraperConfig;
  private userAgent: string;

  constructor(config: ScraperConfig = {}) {
    this.config = { ...defaultConfig, ...config };
    this.userAgent = config.userAgent || new UserAgent().toString();
  }

  async initialize() {
    if (!this.browser) {
      try {
        this.browser = await chromium.launch({
          headless: this.config.headless,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      } catch (error) {
        console.error('Failed to launch browser:', error);
        throw new ExternalServiceError('Browser Launch', error as Error);
      }
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async createPage(): Promise<Page> {
    if (!this.browser) {
      await this.initialize();
    }
    
    try {
      const page = await this.browser!.newPage();
      
      // Set user agent to avoid detection
      await page.setExtraHTTPHeaders({
        'User-Agent': this.userAgent,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });
      
      // Set viewport to look more like a real browser
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      return page;
    } catch (error) {
      console.error('Failed to create page:', error);
      throw new ExternalServiceError('Page Creation', error as Error);
    }
  }

  async scrapeIndeed(keywords: string, location: string, limit: number = 25): Promise<JobPosting[]> {
    const page = await this.createPage();
    const jobs: JobPosting[] = [];
    
    try {
      const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(location)}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout });
      
      // Wait for job listings to load
      await page.waitForSelector('.jobsearch-ResultsList', { timeout: 10000 });
      
      // Extract job data
      const jobElements = await page.$$('.job_seen_beacon');
      
      for (let i = 0; i < Math.min(jobElements.length, limit); i++) {
        const element = jobElements[i];
        
        const job: JobPosting = {
          title: await element.$eval('.jobTitle span[title]', el => el.textContent?.trim() || '') || '',
          company: await element.$eval('[data-testid="company-name"]', el => el.textContent?.trim() || '') || '',
          location: await element.$eval('[data-testid="job-location"]', el => el.textContent?.trim() || '') || '',
          url: await element.$eval('.jobTitle a', el => 'https://www.indeed.com' + el.getAttribute('href')) || '',
          source: 'indeed',
          date: new Date().toISOString()
        };
        
        // Get job description if available
        try {
          const description = await element.$eval('.job-snippet', el => el.textContent?.trim() || '');
          job.text = description;
        } catch (e) {
          // Description might not be available
        }
        
        if (job.title && job.company) {
          jobs.push(job);
        }
      }
    } catch (error) {
      console.error('Indeed scraping error:', error);
      throw new ExternalServiceError('Indeed Scraper', error as Error);
    } finally {
      await page.close();
    }
    
    return jobs;
  }

  async scrapeLinkedIn(keywords: string, location: string, limit: number = 25): Promise<JobPosting[]> {
    const page = await this.createPage();
    const jobs: JobPosting[] = [];
    
    try {
      // LinkedIn requires different approach - using their public job search
      const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout });
      
      // Wait for job listings
      await page.waitForSelector('.jobs-search__results-list', { timeout: 10000 });
      
      // Scroll to load more jobs
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(2000);
      
      const jobCards = await page.$$('.base-card');
      
      for (let i = 0; i < Math.min(jobCards.length, limit); i++) {
        const card = jobCards[i];
        
        const job: JobPosting = {
          title: await card.$eval('.base-search-card__title', el => el.textContent?.trim() || '') || '',
          company: await card.$eval('.base-search-card__subtitle', el => el.textContent?.trim() || '') || '',
          location: await card.$eval('.job-search-card__location', el => el.textContent?.trim() || '') || '',
          url: await card.$eval('.base-card__full-link', el => el.getAttribute('href') || '') || '',
          source: 'linkedin',
          date: new Date().toISOString()
        };
        
        if (job.title && job.company) {
          jobs.push(job);
        }
      }
    } catch (error) {
      console.error('LinkedIn scraping error:', error);
      // LinkedIn is harder to scrape, don't throw error, just return what we got
    } finally {
      await page.close();
    }
    
    return jobs;
  }

  async scrapeGlassdoor(keywords: string, location: string, limit: number = 25): Promise<JobPosting[]> {
    const page = await this.createPage();
    const jobs: JobPosting[] = [];
    
    try {
      const url = `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(keywords)}&locT=C&locId=1147401&locKeyword=${encodeURIComponent(location)}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout });
      
      // Handle cookie consent if it appears
      try {
        await page.click('#onetrust-accept-btn-handler', { timeout: 3000 });
      } catch (e) {
        // Cookie banner might not appear
      }
      
      // Wait for job listings
      await page.waitForSelector('[data-test="job-card"]', { timeout: 10000 });
      
      const jobCards = await page.$$('[data-test="job-card"]');
      
      for (let i = 0; i < Math.min(jobCards.length, limit); i++) {
        const card = jobCards[i];
        
        const job: JobPosting = {
          title: await card.$eval('[data-test="job-title"]', el => el.textContent?.trim() || '') || '',
          company: await card.$eval('[data-test="employer-name"]', el => el.textContent?.trim() || '') || '',
          location: await card.$eval('[data-test="job-location"]', el => el.textContent?.trim() || '') || '',
          url: await card.$eval('a', el => 'https://www.glassdoor.com' + el.getAttribute('href')) || '',
          source: 'glassdoor',
          date: new Date().toISOString()
        };
        
        if (job.title && job.company) {
          jobs.push(job);
        }
      }
    } catch (error) {
      console.error('Glassdoor scraping error:', error);
      // Don't throw, just return what we got
    } finally {
      await page.close();
    }
    
    return jobs;
  }

  async scrapeZipRecruiter(keywords: string, location: string, limit: number = 25): Promise<JobPosting[]> {
    const page = await this.createPage();
    const jobs: JobPosting[] = [];
    
    try {
      const url = `https://www.ziprecruiter.com/jobs-search?search=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout });
      
      // Wait for job listings
      await page.waitForSelector('article[class*="job_result"]', { timeout: 10000 });
      
      const jobCards = await page.$$('article[class*="job_result"]');
      
      for (let i = 0; i < Math.min(jobCards.length, limit); i++) {
        const card = jobCards[i];
        
        const job: JobPosting = {
          title: await card.$eval('h2 a', el => el.textContent?.trim() || '') || '',
          company: await card.$eval('[data-testid="job-card-company"]', el => el.textContent?.trim() || '') || '',
          location: await card.$eval('[data-testid="job-card-location"]', el => el.textContent?.trim() || '') || '',
          url: await card.$eval('h2 a', el => el.getAttribute('href') || '') || '',
          source: 'ziprecruiter',
          date: new Date().toISOString()
        };
        
        if (job.title && job.company) {
          jobs.push(job);
        }
      }
    } catch (error) {
      console.error('ZipRecruiter scraping error:', error);
    } finally {
      await page.close();
    }
    
    return jobs;
  }

  async scrapeSimplyHired(keywords: string, location: string, limit: number = 25): Promise<JobPosting[]> {
    const page = await this.createPage();
    const jobs: JobPosting[] = [];
    
    try {
      const url = `https://www.simplyhired.com/search?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(location)}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout });
      
      // Wait for job listings
      await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });
      
      const jobCards = await page.$$('[data-testid="job-card"]');
      
      for (let i = 0; i < Math.min(jobCards.length, limit); i++) {
        const card = jobCards[i];
        
        const job: JobPosting = {
          title: await card.$eval('[data-testid="job-title"]', el => el.textContent?.trim() || '') || '',
          company: await card.$eval('[data-testid="company-name"]', el => el.textContent?.trim() || '') || '',
          location: await card.$eval('[data-testid="job-location"]', el => el.textContent?.trim() || '') || '',
          url: await card.$eval('a', el => el.getAttribute('href') || '') || '',
          source: 'simplyhired',
          date: new Date().toISOString()
        };
        
        if (job.title && job.company) {
          jobs.push(job);
        }
      }
    } catch (error) {
      console.error('SimplyHired scraping error:', error);
    } finally {
      await page.close();
    }
    
    return jobs;
  }
}

// Main search function that aggregates results from multiple job boards
export async function searchJobBoardsReal(
  keywords: string, 
  location: string, 
  boardsToSearch: string[] = ['indeed', 'linkedin', 'glassdoor', 'ziprecruiter', 'simplyhired'],
  maxPerBoard: number = 20
): Promise<JobPosting[]> {
  const scraper = new JobBoardScraper();
  const allJobs: JobPosting[] = [];
  
  try {
    await scraper.initialize();
    
    // Search each board in parallel with rate limiting
    const searchPromises = boardsToSearch.map(board => 
      rateLimiter.run(async () => {
        try {
          switch (board) {
            case 'indeed':
              return await scraper.scrapeIndeed(keywords, location, maxPerBoard);
            case 'linkedin':
              return await scraper.scrapeLinkedIn(keywords, location, maxPerBoard);
            case 'glassdoor':
              return await scraper.scrapeGlassdoor(keywords, location, maxPerBoard);
            case 'ziprecruiter':
              return await scraper.scrapeZipRecruiter(keywords, location, maxPerBoard);
            case 'simplyhired':
              return await scraper.scrapeSimplyHired(keywords, location, maxPerBoard);
            default:
              return [];
          }
        } catch (error) {
          console.error(`Error scraping ${board}:`, error);
          return [];
        }
      })
    );
    
    const results = await Promise.all(searchPromises);
    results.forEach(jobs => allJobs.push(...jobs));
    
  } finally {
    await scraper.close();
  }
  
  // Deduplicate jobs
  const uniqueJobs = deduplicateJobs(allJobs);
  
  // Sort by relevance
  return sortJobsByRelevance(uniqueJobs, keywords);
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
    const scoreA = calculateRelevanceScore(a, keywordList);
    const scoreB = calculateRelevanceScore(b, keywordList);
    
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    
    // Sort by date if available
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });
}

function calculateRelevanceScore(job: JobPosting, keywords: string[]): number {
  let score = 0;
  const title = job.title.toLowerCase();
  const company = job.company.toLowerCase();
  const text = (job.text || '').toLowerCase();
  
  keywords.forEach(keyword => {
    if (title.includes(keyword)) score += 3;
    if (company.includes(keyword)) score += 1;
    if (text.includes(keyword)) score += 2;
  });
  
  // Boost for automation-related terms
  const automationTerms = ['data entry', 'manual', 'repetitive', 'coordinator', 'processor', 'analyst'];
  automationTerms.forEach(term => {
    if (title.includes(term)) score += 2;
    if (text.includes(term)) score += 1;
  });
  
  return score;
}