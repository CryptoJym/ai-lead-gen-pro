import { Finding, OsintContext } from '@/types';

export async function analyzeGrowthSignals(context: OsintContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  
  // Hiring velocity
  if (context.jobs && context.jobs.length > 0) {
    const jobCount = context.jobs.length;
    let growthLevel: string;
    let confidence: number;
    
    if (jobCount >= 20) {
      growthLevel = 'Rapid Growth';
      confidence = 0.95;
    } else if (jobCount >= 10) {
      growthLevel = 'Strong Growth';
      confidence = 0.9;
    } else if (jobCount >= 5) {
      growthLevel = 'Moderate Growth';
      confidence = 0.85;
    } else {
      growthLevel = 'Steady Growth';
      confidence = 0.8;
    }
    
    findings.push({
      title: `${growthLevel} Indicated by Hiring`,
      detail: `${jobCount} open positions indicate ${growthLevel.toLowerCase()}. Growing companies need scalable processes and automation.`,
      confidence,
      tags: ['growth', 'hiring', 'scaling'],
      sources: [{
        title: 'Job Postings Analysis',
        date: new Date().toISOString().split('T')[0]
      }]
    });
    
    // Department expansion patterns
    const departments = new Set<string>();
    context.jobs.forEach(job => {
      const dept = extractDepartment(job.title);
      if (dept) departments.add(dept);
    });
    
    if (departments.size >= 4) {
      findings.push({
        title: 'Multi-Department Expansion',
        detail: `Hiring across ${departments.size} departments: ${Array.from(departments).join(', ')}. Indicates company-wide growth.`,
        confidence: 0.85,
        tags: ['growth', 'expansion', 'scaling'],
        sources: context.jobs.slice(0, 5).map(j => ({
          title: j.title,
          url: j.url
        }))
      });
    }
  }
  
  // News and PR signals
  if (context.news && context.news.length > 0) {
    const recentNews = context.news.filter(n => {
      if (!n.date) return true;
      const newsDate = new Date(n.date);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return newsDate > sixMonthsAgo;
    });
    
    const growthKeywords = ['funding', 'investment', 'acquisition', 'expansion', 'partnership', 'launch', 'new market'];
    const growthNews = recentNews.filter(n => 
      growthKeywords.some(keyword => n.title.toLowerCase().includes(keyword))
    );
    
    if (growthNews.length > 0) {
      findings.push({
        title: 'Recent Growth Activity in News',
        detail: `${growthNews.length} recent news items about growth: ${growthNews[0].title}`,
        confidence: 0.9,
        tags: ['growth', 'news', 'expansion'],
        sources: growthNews.slice(0, 3).map(n => ({
          title: n.title,
          url: n.url,
          date: n.date
        }))
      });
    }
  }
  
  // Social media growth
  if (context.social && context.social.length > 0) {
    const totalFollowers = context.social.reduce((sum, s) => sum + (s.followers || 0), 0);
    
    if (totalFollowers > 50000) {
      findings.push({
        title: 'Strong Social Media Presence',
        detail: `${totalFollowers.toLocaleString()} total followers across ${context.social.length} platforms. Indicates brand strength and growth.`,
        confidence: 0.8,
        tags: ['growth', 'social-media', 'brand'],
        sources: context.social.map(s => ({
          title: `${s.platform} Profile`,
          url: s.url
        }))
      });
    }
  }
  
  // Website evolution (from archives)
  if (context.archives && context.archives.length > 1) {
    const oldestSnapshot = context.archives[context.archives.length - 1];
    const newestSnapshot = context.archives[0];
    
    if (oldestSnapshot && newestSnapshot) {
      const oldDate = new Date(oldestSnapshot.date);
      const newDate = new Date(newestSnapshot.date);
      const yearsDiff = (newDate.getTime() - oldDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
      
      if (yearsDiff > 1) {
        findings.push({
          title: 'Website Evolution Tracked',
          detail: `Website has evolved over ${Math.round(yearsDiff)} years. Regular updates indicate active business growth.`,
          confidence: 0.75,
          tags: ['growth', 'digital-presence'],
          sources: [
            {
              title: 'Latest Website',
              url: newestSnapshot.url,
              date: newestSnapshot.date
            },
            {
              title: 'Historical Website',
              url: oldestSnapshot.snapshotUrl,
              date: oldestSnapshot.date
            }
          ]
        });
      }
    }
  }
  
  return findings;
}

function extractDepartment(jobTitle: string): string | null {
  const title = jobTitle.toLowerCase();
  const departments = {
    'Engineering': ['engineer', 'developer', 'architect', 'devops'],
    'Sales': ['sales', 'account executive', 'bdr', 'sdr'],
    'Marketing': ['marketing', 'content', 'seo', 'growth'],
    'Operations': ['operations', 'ops ', 'coordinator'],
    'Customer Success': ['customer success', 'support', 'service'],
    'Product': ['product manager', 'product owner', 'pm '],
    'Finance': ['finance', 'accounting', 'controller'],
    'HR': ['human resources', 'hr ', 'recruiter', 'talent']
  };
  
  for (const [dept, keywords] of Object.entries(departments)) {
    if (keywords.some(keyword => title.includes(keyword))) {
      return dept;
    }
  }
  
  return null;
}