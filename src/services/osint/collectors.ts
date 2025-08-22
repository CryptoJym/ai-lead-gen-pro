import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { Company, OsintContext } from '@/types';

// API configurations
const API_CONFIGS = {
  newsAPI: {
    key: process.env.NEWS_API_KEY,
    url: 'https://newsapi.org/v2/everything'
  },
  serpAPI: {
    key: process.env.SERP_API_KEY,
    url: 'https://serpapi.com/search.json'
  },
  builtWith: {
    key: process.env.BUILTWITH_API_KEY,
    url: 'https://api.builtwith.com/v14/api.json'
  }
};

// Corporate data collection from various sources
export async function collectCorporateDataReal(company: Company): Promise<OsintContext['corp']> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Try to get data from company website
    if (company.domain || company.homepageUrl) {
      const url = company.homepageUrl || `https://${company.domain}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Extract basic info from website
      const corpData = await page.evaluate(() => {
        const getMetaContent = (name: string) => {
          const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
          return meta?.getAttribute('content') || null;
        };
        
        // Look for structured data
        const ldJson = document.querySelector('script[type="application/ld+json"]');
        let structuredData: any = {};
        if (ldJson) {
          try {
            structuredData = JSON.parse(ldJson.textContent || '{}');
          } catch (e) {}
        }
        
        return {
          description: getMetaContent('description') || getMetaContent('og:description'),
          industry: structuredData['@type'] || structuredData.industry,
          foundingDate: structuredData.foundingDate,
          employees: structuredData.numberOfEmployees,
          location: structuredData.address?.addressLocality || structuredData.location
        };
      });
      
      return {
        name: company.name,
        domain: company.domain,
        founded: corpData.foundingDate,
        employees: corpData.employees,
        revenue: null,
        industry: corpData.industry,
        description: corpData.description,
        location: corpData.location
      };
    }
  } catch (error) {
    console.error('Corporate data collection error:', error);
  } finally {
    await browser.close();
  }
  
  return {
    name: company.name,
    domain: company.domain,
    founded: null,
    employees: null,
    revenue: null,
    industry: null
  };
}

// News data collection using NewsAPI
export async function collectNewsDataReal(company: Company): Promise<OsintContext['news']> {
  if (!API_CONFIGS.newsAPI.key) {
    console.log('NewsAPI key not configured');
    return [];
  }
  
  try {
    const query = encodeURIComponent(company.name);
    const url = `${API_CONFIGS.newsAPI.url}?q=${query}&sortBy=relevancy&pageSize=10&apiKey=${API_CONFIGS.newsAPI.key}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.articles) {
      return data.articles.map((article: any) => ({
        title: article.title,
        url: article.url,
        date: article.publishedAt,
        source: article.source.name,
        summary: article.description,
        sentiment: null // Would need sentiment analysis
      }));
    }
  } catch (error) {
    console.error('News collection error:', error);
  }
  
  // Fallback: scrape Google News
  return scrapeGoogleNews(company.name);
}

async function scrapeGoogleNews(companyName: string): Promise<OsintContext['news']> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const news: OsintContext['news'] = [];
  
  try {
    const url = `https://news.google.com/search?q=${encodeURIComponent(companyName)}&hl=en-US&gl=US&ceid=US:en`;
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Extract news articles
    const articles = await page.$$('article');
    
    for (let i = 0; i < Math.min(articles.length, 10); i++) {
      const article = articles[i];
      
      const newsItem = {
        title: await article.$eval('h3', el => el.textContent?.trim() || '') || '',
        url: await article.$eval('a', el => el.getAttribute('href') || '') || '',
        date: await article.$eval('time', el => el.getAttribute('datetime') || '') || new Date().toISOString(),
        source: await article.$eval('[data-n-tid]', el => el.textContent?.trim() || '') || '',
        summary: null,
        sentiment: null
      };
      
      if (newsItem.title && newsItem.url) {
        // Convert Google News URL to actual article URL
        if (newsItem.url.startsWith('./')) {
          newsItem.url = `https://news.google.com${newsItem.url.substring(1)}`;
        }
        news.push(newsItem);
      }
    }
  } catch (error) {
    console.error('Google News scraping error:', error);
  } finally {
    await browser.close();
  }
  
  return news;
}

// Tech stack detection using BuiltWith API or web scraping
export async function collectTechDataReal(company: Company): Promise<OsintContext['tech']> {
  const tech: OsintContext['tech'] = [];
  
  // Try BuiltWith API first
  if (API_CONFIGS.builtWith.key && company.domain) {
    try {
      const url = `${API_CONFIGS.builtWith.url}?KEY=${API_CONFIGS.builtWith.key}&LOOKUP=${company.domain}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.Results && data.Results[0]) {
        const result = data.Results[0];
        Object.keys(result.Result.Paths).forEach(category => {
          result.Result.Paths[category].Technologies.forEach((tech: any) => {
            tech.push({
              name: tech.Name,
              category: tech.Categories[0],
              description: tech.Description,
              firstDetected: tech.FirstDetected,
              lastDetected: tech.LastDetected
            });
          });
        });
      }
      
      return tech;
    } catch (error) {
      console.error('BuiltWith API error:', error);
    }
  }
  
  // Fallback: Analyze website technologies
  return await detectTechFromWebsite(company);
}

async function detectTechFromWebsite(company: Company): Promise<OsintContext['tech']> {
  if (!company.domain && !company.homepageUrl) return [];
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const tech: OsintContext['tech'] = [];
  
  try {
    const url = company.homepageUrl || `https://${company.domain}`;
    
    // Intercept responses to detect technologies
    const detectedTech = new Set<string>();
    
    page.on('response', response => {
      const url = response.url();
      const headers = response.headers();
      
      // Detect from headers
      if (headers['x-powered-by']) {
        detectedTech.add(headers['x-powered-by']);
      }
      if (headers['server']) {
        detectedTech.add(headers['server']);
      }
      
      // Detect from URLs
      if (url.includes('jquery')) detectedTech.add('jQuery');
      if (url.includes('react')) detectedTech.add('React');
      if (url.includes('angular')) detectedTech.add('Angular');
      if (url.includes('vue')) detectedTech.add('Vue.js');
      if (url.includes('wordpress')) detectedTech.add('WordPress');
      if (url.includes('shopify')) detectedTech.add('Shopify');
      if (url.includes('cloudflare')) detectedTech.add('Cloudflare');
      if (url.includes('googleapis')) detectedTech.add('Google APIs');
      if (url.includes('stripe')) detectedTech.add('Stripe');
    });
    
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Detect from page content
    const pageDetections = await page.evaluate(() => {
      const detected: string[] = [];
      
      // Check for common frameworks
      if ((window as any).React) detected.push('React');
      if ((window as any).Vue) detected.push('Vue.js');
      if ((window as any).angular) detected.push('Angular');
      if ((window as any).jQuery || (window as any).$) detected.push('jQuery');
      if ((window as any).wp || document.querySelector('meta[name="generator"][content*="WordPress"]')) {
        detected.push('WordPress');
      }
      
      // Check for analytics
      if ((window as any).ga || (window as any).gtag) detected.push('Google Analytics');
      if ((window as any).fbq) detected.push('Facebook Pixel');
      if ((window as any).mixpanel) detected.push('Mixpanel');
      
      // Check meta tags
      const generator = document.querySelector('meta[name="generator"]');
      if (generator) {
        detected.push(generator.getAttribute('content') || '');
      }
      
      return detected;
    });
    
    // Combine all detections
    [...detectedTech, ...pageDetections].forEach(techName => {
      if (techName) {
        tech.push({
          name: techName,
          product: techName,
          slug: techName.toLowerCase().replace(/\s+/g, '-')
        });
      }
    });
    
  } catch (error) {
    console.error('Tech detection error:', error);
  } finally {
    await browser.close();
  }
  
  return tech;
}

function categorizeTech(techName: string): string {
  const categories: { [key: string]: string[] } = {
    'Frontend': ['React', 'Vue.js', 'Angular', 'jQuery'],
    'CMS': ['WordPress', 'Drupal', 'Joomla'],
    'E-commerce': ['Shopify', 'WooCommerce', 'Magento'],
    'Analytics': ['Google Analytics', 'Mixpanel', 'Segment', 'Facebook Pixel'],
    'Infrastructure': ['Cloudflare', 'AWS', 'Azure', 'Google Cloud'],
    'Payment': ['Stripe', 'PayPal', 'Square'],
    'Backend': ['Node.js', 'PHP', 'Python', 'Ruby', 'Java']
  };
  
  for (const [category, techs] of Object.entries(categories)) {
    if (techs.some(t => techName.toLowerCase().includes(t.toLowerCase()))) {
      return category;
    }
  }
  
  return 'Other';
}

// Social media presence collection
export async function collectSocialDataReal(company: Company): Promise<OsintContext['social']> {
  const social: OsintContext['social'] = [];
  const browser = await chromium.launch({ headless: true });
  
  try {
    // Check major social platforms
    const platforms = [
      { name: 'linkedin', urlPattern: `https://www.linkedin.com/company/${company.name.toLowerCase().replace(/\s+/g, '-')}` },
      { name: 'twitter', urlPattern: `https://twitter.com/${company.name.toLowerCase().replace(/\s+/g, '')}` },
      { name: 'facebook', urlPattern: `https://www.facebook.com/${company.name.toLowerCase().replace(/\s+/g, '')}` }
    ];
    
    for (const platform of platforms) {
      const page = await browser.newPage();
      
      try {
        await page.goto(platform.urlPattern, { waitUntil: 'networkidle', timeout: 15000 });
        
        // Check if page exists (no 404)
        const is404 = await page.evaluate(() => {
          return document.title.toLowerCase().includes('not found') || 
                 document.body.textContent?.toLowerCase().includes('page not found') || false;
        });
        
        if (!is404) {
          let metrics: any = {};
          
          if (platform.name === 'linkedin') {
            metrics = await page.evaluate(() => {
              const followers = document.querySelector('[data-test-id="about-us__followers"]')?.textContent;
              const employees = document.querySelector('[data-test-id="about-us__employees"]')?.textContent;
              return { followers, employees };
            });
          }
          
          social.push({
            platform: platform.name,
            url: platform.urlPattern,
            followers: metrics.followers ? parseInt(metrics.followers.replace(/\D/g, '')) : null,
            engagement: null,
            lastPost: null,
            metrics
          });
        }
      } catch (error) {
        // Platform page might not exist
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  
  return social;
}

// Government procurement data
export async function collectProcurementDataReal(company: Company): Promise<OsintContext['procurement']> {
  const procurement: OsintContext['procurement'] = [];
  
  // Check SAM.gov (US government contracts)
  if (process.env.SAM_GOV_API_KEY) {
    try {
      const response = await fetch(
        `https://api.sam.gov/entity-information/v2/entities?legalBusinessName=${encodeURIComponent(company.name)}&api_key=${process.env.SAM_GOV_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.entityData && data.entityData.length > 0) {
          // Company is registered in SAM.gov
          procurement.push({
            agency: 'Federal (SAM.gov registered)',
            amount: null,
            date: data.entityData[0].registrationDate,
            description: 'Registered federal contractor',
            status: data.entityData[0].registrationStatus
          });
        }
      }
    } catch (error) {
      console.error('SAM.gov API error:', error);
    }
  }
  
  return procurement;
}

// Web archive history
export async function collectArchivesDataReal(company: Company): Promise<OsintContext['archives']> {
  const archives: OsintContext['archives'] = [];
  
  if (!company.domain && !company.homepageUrl) return archives;
  
  const domain = company.domain || new URL(company.homepageUrl!).hostname;
  
  try {
    // Check Wayback Machine
    const response = await fetch(`https://archive.org/wayback/available?url=${domain}`);
    const data = await response.json();
    
    if (data.archived_snapshots && data.archived_snapshots.closest) {
      const snapshot = data.archived_snapshots.closest;
      archives.push({
        url: `https://${domain}`,
        timestamp: snapshot.timestamp,
        snapshotUrl: snapshot.url,
        status: snapshot.status,
        available: snapshot.available
      });
      
      // Get more historical snapshots
      const cdxResponse = await fetch(
        `https://web.archive.org/cdx/search/cdx?url=${domain}&output=json&limit=10`
      );
      
      if (cdxResponse.ok) {
        const cdxData = await cdxResponse.json();
        // Skip header row
        for (let i = 1; i < cdxData.length; i++) {
          const [urlkey, timestamp, original, mimetype, statuscode, digest, length] = cdxData[i];
          archives.push({
            url: original,
            timestamp,
            snapshotUrl: `https://web.archive.org/web/${timestamp}/${original}`,
            status: statuscode,
            available: true
          });
        }
      }
    }
  } catch (error) {
    console.error('Archive collection error:', error);
  }
  
  return archives;
}