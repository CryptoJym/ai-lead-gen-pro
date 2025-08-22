import { Finding, OsintContext } from '@/types';

const AUTOMATION_KEYWORDS = [
  'data entry', 'manual process', 'repetitive', 'excel', 'spreadsheet',
  'coordinate', 'schedule', 'track', 'monitor', 'report', 'analyze',
  'customer service', 'support tickets', 'inventory', 'compliance',
  'documentation', 'filing', 'processing', 'reconciliation'
];

const HIGH_VOLUME_INDICATORS = [
  'high volume', 'fast-paced', 'multiple', 'numerous', 'heavy',
  'extensive', 'large amount', 'significant'
];

export async function analyzeJobPostings(context: OsintContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  
  if (!context.jobs || context.jobs.length === 0) {
    return findings;
  }
  
  // Analyze each job posting
  const automationOpportunities: string[] = [];
  const roles = new Map<string, number>();
  
  context.jobs.forEach(job => {
    const titleLower = job.title.toLowerCase();
    const textLower = (job.text || '').toLowerCase();
    const combined = `${titleLower} ${textLower}`;
    
    // Count role types
    const roleType = categorizeRole(titleLower);
    roles.set(roleType, (roles.get(roleType) || 0) + 1);
    
    // Check for automation keywords
    const matchedKeywords = AUTOMATION_KEYWORDS.filter(keyword => 
      combined.includes(keyword)
    );
    
    if (matchedKeywords.length > 0) {
      automationOpportunities.push(
        `${job.title}: ${matchedKeywords.join(', ')}`
      );
    }
    
    // Check for high volume indicators
    const hasHighVolume = HIGH_VOLUME_INDICATORS.some(indicator => 
      combined.includes(indicator)
    );
    
    if (hasHighVolume && matchedKeywords.length > 0) {
      findings.push({
        title: `High-Volume ${roleType} Role Identified`,
        detail: `${job.title} indicates high-volume ${matchedKeywords.join(', ')} tasks. Prime candidate for automation.`,
        confidence: 0.85,
        tags: ['automation-opportunity', 'high-impact', 'job-posting'],
        sources: [{
          title: job.title,
          url: job.url
        }]
      });
    }
  });
  
  // Summary findings
  if (automationOpportunities.length > 0) {
    findings.push({
      title: 'Multiple Automation Opportunities in Job Postings',
      detail: `Found ${automationOpportunities.length} roles with automation potential: ${automationOpportunities.slice(0, 3).join('; ')}${automationOpportunities.length > 3 ? '...' : ''}`,
      confidence: 0.8,
      tags: ['automation-opportunity', 'job-analysis'],
      sources: context.jobs.slice(0, 5).map(j => ({
        title: j.title,
        url: j.url
      }))
    });
  }
  
  // Role distribution analysis
  const topRoles = Array.from(roles.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  
  if (topRoles.length > 0) {
    findings.push({
      title: 'Hiring Pattern Analysis',
      detail: `Primary hiring focus: ${topRoles.map(([role, count]) => `${role} (${count})`).join(', ')}. Total open positions: ${context.jobs.length}`,
      confidence: 0.9,
      tags: ['hiring-patterns', 'growth'],
      sources: [{
        title: 'Job Postings Analysis',
        date: new Date().toISOString().split('T')[0]
      }]
    });
  }
  
  return findings;
}

function categorizeRole(title: string): string {
  const categories = {
    'Operations': ['operations', 'coordinator', 'specialist', 'analyst', 'manager'],
    'Customer Service': ['customer', 'support', 'service', 'success', 'representative'],
    'Data/Analytics': ['data', 'analyst', 'analytics', 'reporting', 'insights'],
    'Administrative': ['admin', 'assistant', 'clerk', 'office', 'receptionist'],
    'Sales': ['sales', 'account', 'business development', 'bd ', 'bdr', 'sdr'],
    'Technical': ['engineer', 'developer', 'technical', 'it ', 'software'],
    'Finance': ['finance', 'accounting', 'bookkeeper', 'controller', 'payroll'],
    'HR': ['hr ', 'human resources', 'recruiter', 'talent', 'people']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => title.includes(keyword))) {
      return category;
    }
  }
  
  return 'Other';
}