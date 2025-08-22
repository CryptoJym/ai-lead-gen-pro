# Restoration Plan - Real Search & Scraping Implementation

## Issue
During migration from the original Lead-Gen-Program, mock implementations were created instead of preserving the actual search and scraping capabilities. The original system had real integrations that produced actual results.

## What Needs to Be Restored

### 1. Job Board Integration
The original likely used one or more of these approaches:
- **Direct APIs**: Indeed, LinkedIn, Glassdoor APIs
- **Web Scraping**: Puppeteer/Playwright for boards without APIs
- **Third-party aggregators**: Services like SerpAPI, ScraperAPI

### 2. OSINT Data Collection
Real implementations needed for:
- **Corporate Data**: Crunchbase API, OpenCorporates
- **News**: NewsAPI, Bing News Search API
- **Tech Stack**: BuiltWith API, Wappalyzer
- **Social Media**: Twitter API, LinkedIn API
- **Procurement**: SAM.gov API, local government APIs
- **Archives**: Wayback Machine API

### 3. LLM Integration with Local OSS 120B
Replace the pattern matching with actual LLM calls:

```typescript
// Example integration with local 120B model
import { getLLMProvider } from '@/lib/llm';

async function analyzeWithLLM(context: OsintContext): Promise<Finding[]> {
  const llm = getLLMProvider(); // Configured for local OSS 120B
  
  const analysis = await llm.analyzeContext(context, `
    Analyze this company for AI automation opportunities:
    - Review job postings for repetitive/manual tasks
    - Assess tech stack for modernization needs
    - Identify growth signals requiring scalability
    - Score automation potential 0-10
  `);
  
  return llm.extractFindings(analysis);
}
```

## Implementation Options

### Option 1: Restore Original Implementation
If you have access to the original repository's actual code, we can:
1. Extract the real API integrations
2. Migrate them to TypeScript
3. Update for current API versions

### Option 2: Implement Fresh with Modern Tools

#### Job Board Scraping
```typescript
// Using Puppeteer for job boards
import puppeteer from 'puppeteer';

async function scrapeIndeed(keywords: string, location: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto(`https://indeed.com/jobs?q=${keywords}&l=${location}`);
  
  const jobs = await page.evaluate(() => {
    // Extract job data from page
    return Array.from(document.querySelectorAll('.job_seen_beacon')).map(job => ({
      title: job.querySelector('.jobTitle')?.textContent,
      company: job.querySelector('.companyName')?.textContent,
      location: job.querySelector('.locationsContainer')?.textContent,
      url: job.querySelector('a')?.href
    }));
  });
  
  await browser.close();
  return jobs;
}
```

#### API Integrations
```typescript
// News API integration
async function collectNewsData(company: string) {
  const response = await fetch(
    `https://newsapi.org/v2/everything?q=${company}&apiKey=${process.env.NEWS_API_KEY}`
  );
  const data = await response.json();
  return data.articles.map(article => ({
    title: article.title,
    url: article.url,
    date: article.publishedAt,
    source: article.source.name
  }));
}

// BuiltWith API
async function collectTechStack(domain: string) {
  const response = await fetch(
    `https://api.builtwith.com/v14/api.json?KEY=${process.env.BUILTWITH_KEY}&LOOKUP=${domain}`
  );
  return response.json();
}
```

## Quick Start Implementation

### 1. Install Dependencies
```bash
npm install puppeteer playwright cheerio
npm install --save-dev @types/puppeteer
```

### 2. Environment Variables
```env
# APIs
NEWS_API_KEY=your-key
BUILTWITH_API_KEY=your-key
SERPAPI_KEY=your-key

# Local LLM
LLM_PROVIDER=local
LLM_BASE_URL=http://localhost:8080
LLM_MODEL=oss-120b
```

### 3. Implement Real Job Search
Replace the mock in `job-boards.ts` with actual scraping:

```typescript
import { chromium } from 'playwright';

export async function searchJobBoards(params: JobSearchParams): Promise<JobPosting[]> {
  const browser = await chromium.launch();
  const results: JobPosting[] = [];
  
  // Search Indeed
  const page = await browser.newPage();
  await page.goto(`https://indeed.com/jobs?q=${params.keywords}&l=${params.location}`);
  
  const jobs = await page.$$eval('.job_seen_beacon', elements => 
    elements.map(el => ({
      title: el.querySelector('.jobTitle span')?.textContent || '',
      company: el.querySelector('.companyName')?.textContent || '',
      location: el.querySelector('[data-testid="job-location"]')?.textContent || '',
      url: el.querySelector('.jobTitle a')?.getAttribute('href') || ''
    }))
  );
  
  results.push(...jobs);
  await browser.close();
  
  return results;
}
```

## Next Steps

1. **Identify Original Data Sources**: Check the original repo for API keys, endpoints
2. **Implement Incrementally**: Start with one job board, test, then expand
3. **Add Error Handling**: Real APIs fail, need retries and fallbacks
4. **Cache Aggressively**: Don't re-scrape the same data
5. **Respect Rate Limits**: Add delays between requests

## Testing with Local LLM

Once real data collection is working:
1. Feed actual job postings to your OSS 120B model
2. Use the LLM to identify automation patterns
3. Generate real, actionable insights

The combination of real data + powerful local LLM should match or exceed the original system's capabilities.