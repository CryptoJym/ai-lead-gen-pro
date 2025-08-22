import { Finding, OsintContext } from '@/types';

export async function analyzeBusinessModel(context: OsintContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  
  // Analyze based on available signals
  const signals = {
    hasJobs: context.jobs && context.jobs.length > 0,
    hasNews: context.news && context.news.length > 0,
    hasProcurement: context.procurement && context.procurement.length > 0,
    hasSocial: context.social && context.social.length > 0,
    hasArchives: context.archives && context.archives.length > 0
  };
  
  // B2B vs B2C indicators
  const b2bIndicators = [
    signals.hasProcurement,
    context.jobs?.some(j => j.title.toLowerCase().includes('enterprise')),
    context.jobs?.some(j => j.title.toLowerCase().includes('b2b')),
    context.tech?.some(t => ['salesforce', 'hubspot', 'dynamics'].includes((t.name || '').toLowerCase()))
  ].filter(Boolean).length;
  
  const b2cIndicators = [
    context.social?.some(s => (s.followers || 0) > 10000),
    context.jobs?.some(j => j.title.toLowerCase().includes('consumer')),
    context.jobs?.some(j => j.title.toLowerCase().includes('retail')),
    context.tech?.some(t => ['shopify', 'woocommerce', 'magento'].includes((t.name || '').toLowerCase()))
  ].filter(Boolean).length;
  
  // Business model determination
  if (b2bIndicators > b2cIndicators) {
    findings.push({
      title: 'B2B Business Model Detected',
      detail: 'Company appears to focus on business customers. B2B companies often have complex processes ripe for automation.',
      confidence: Math.min(0.6 + (b2bIndicators * 0.1), 0.9),
      tags: ['b2b', 'business-model'],
      sources: [{
        title: 'Business Model Analysis',
        date: new Date().toISOString().split('T')[0]
      }]
    });
  } else if (b2cIndicators > b2bIndicators) {
    findings.push({
      title: 'B2C Business Model Detected',
      detail: 'Company appears to focus on consumers. B2C companies often need automation for scale and customer service.',
      confidence: Math.min(0.6 + (b2cIndicators * 0.1), 0.9),
      tags: ['b2c', 'business-model'],
      sources: [{
        title: 'Business Model Analysis',
        date: new Date().toISOString().split('T')[0]
      }]
    });
  }
  
  // Government contractor analysis
  if (signals.hasProcurement && context.procurement!.length > 0) {
    const totalContracts = context.procurement!.length;
    const totalValue = context.procurement!.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    findings.push({
      title: 'Government Contractor',
      detail: `Active government contractor with ${totalContracts} contracts totaling $${totalValue.toLocaleString()}. Indicates established processes and compliance needs.`,
      confidence: 0.95,
      tags: ['government', 'enterprise', 'compliance', 'high-value'],
      sources: context.procurement!.slice(0, 3).map(p => ({
        title: `${p.agency} Contract`,
        date: p.date,
        url: `https://www.usaspending.gov/search/${context.companyName}`
      }))
    });
  }
  
  // Service vs Product company
  const serviceIndicators = context.jobs?.filter(j => {
    const title = j.title.toLowerCase();
    return ['consultant', 'service', 'support', 'success', 'account'].some(term => title.includes(term));
  }).length || 0;
  
  const productIndicators = context.jobs?.filter(j => {
    const title = j.title.toLowerCase();
    return ['product', 'engineer', 'developer', 'designer'].some(term => title.includes(term));
  }).length || 0;
  
  if (serviceIndicators > productIndicators && serviceIndicators > 2) {
    findings.push({
      title: 'Service-Based Business Model',
      detail: `Heavy focus on service roles (${serviceIndicators} positions). Service businesses benefit from automation for consistency and scale.`,
      confidence: 0.8,
      tags: ['services', 'business-model', 'automation-opportunity'],
      sources: context.jobs!.slice(0, 3).map(j => ({
        title: j.title,
        url: j.url
      }))
    });
  }
  
  return findings;
}