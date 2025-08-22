import { Finding, OsintContext } from '@/types';

const LEGACY_INDICATORS = [
  'excel', 'access', 'vba', 'sharepoint', 'on-premise', 'legacy',
  'manual', 'paper-based', 'fax', 'phone-based'
];

const MODERN_INDICATORS = [
  'cloud', 'saas', 'api', 'automation', 'ai', 'machine learning',
  'analytics', 'dashboard', 'real-time', 'integration'
];

export async function analyzeTechStack(context: OsintContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  
  if (!context.tech || context.tech.length === 0) {
    // No tech stack data - could indicate legacy systems
    findings.push({
      title: 'Limited Technology Visibility',
      detail: 'No modern tech stack detected. May indicate reliance on legacy systems or manual processes.',
      confidence: 0.6,
      tags: ['tech-gap', 'automation-opportunity'],
      sources: [{
        title: 'Tech Stack Analysis',
        date: new Date().toISOString().split('T')[0]
      }]
    });
    return findings;
  }
  
  // Categorize technologies
  const categories = {
    'Analytics': ['analytics', 'tableau', 'powerbi', 'looker', 'datadog'],
    'Cloud': ['aws', 'azure', 'gcp', 'cloud'],
    'Communication': ['slack', 'teams', 'zoom', 'email'],
    'CRM': ['salesforce', 'hubspot', 'pipedrive', 'zoho'],
    'Development': ['github', 'gitlab', 'jira', 'jenkins'],
    'Marketing': ['marketo', 'mailchimp', 'hootsuite', 'buffer'],
    'Productivity': ['office', 'gsuite', 'notion', 'asana', 'monday']
  };
  
  const techByCategory = new Map<string, string[]>();
  const uncategorized: string[] = [];
  
  context.tech.forEach(tech => {
    const name = (tech.name || tech.product || '').toLowerCase();
    let categorized = false;
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        const existing = techByCategory.get(category) || [];
        techByCategory.set(category, [...existing, tech.name || tech.product || '']);
        categorized = true;
        break;
      }
    }
    
    if (!categorized) {
      uncategorized.push(tech.name || tech.product || '');
    }
  });
  
  // Analyze tech maturity
  const hasModernTools = context.tech.some(t => {
    const name = (t.name || t.product || '').toLowerCase();
    return MODERN_INDICATORS.some(indicator => name.includes(indicator));
  });
  
  const hasLegacyTools = context.tech.some(t => {
    const name = (t.name || t.product || '').toLowerCase();
    return LEGACY_INDICATORS.some(indicator => name.includes(indicator));
  });
  
  // Generate findings
  if (hasLegacyTools) {
    findings.push({
      title: 'Legacy Systems Detected',
      detail: 'Presence of legacy tools indicates opportunities for modernization and automation.',
      confidence: 0.8,
      tags: ['legacy-tech', 'automation-opportunity', 'high-impact'],
      sources: [{
        title: 'Technology Stack',
        url: `https://stackshare.io/companies/${context.companyName}`
      }]
    });
  }
  
  if (hasModernTools && !hasLegacyTools) {
    findings.push({
      title: 'Modern Tech Stack',
      detail: 'Company uses modern tools, indicating openness to technology adoption and integration.',
      confidence: 0.85,
      tags: ['modern-tech', 'tech-forward'],
      sources: [{
        title: 'Technology Stack',
        url: `https://stackshare.io/companies/${context.companyName}`
      }]
    });
  }
  
  // Analyze gaps
  const missingCategories = ['Analytics', 'Automation', 'Integration']
    .filter(cat => !techByCategory.has(cat));
  
  if (missingCategories.length > 0) {
    findings.push({
      title: 'Technology Gaps Identified',
      detail: `Missing capabilities in: ${missingCategories.join(', ')}. These represent automation opportunities.`,
      confidence: 0.75,
      tags: ['tech-gap', 'automation-opportunity'],
      sources: [{
        title: 'Gap Analysis',
        date: new Date().toISOString().split('T')[0]
      }]
    });
  }
  
  // Tech diversity score
  if (techByCategory.size >= 4) {
    findings.push({
      title: 'Diverse Technology Adoption',
      detail: `Uses tools across ${techByCategory.size} categories: ${Array.from(techByCategory.keys()).join(', ')}`,
      confidence: 0.9,
      tags: ['tech-adoption', 'tech-forward'],
      sources: context.tech.slice(0, 5).map(t => ({
        title: t.name || t.product || 'Unknown Tool'
      }))
    });
  }
  
  return findings;
}