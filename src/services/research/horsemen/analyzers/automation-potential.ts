import { Finding, OsintContext } from '@/types';

interface AutomationScore {
  score: number;
  confidence: number;
  level: 'high-potential' | 'moderate-potential' | 'low-potential';
}

export async function analyzeAutomationPotential(
  context: OsintContext,
  findings: Finding[]
): Promise<AutomationScore> {
  let score = 0;
  let factors = 0;
  
  // Factor 1: Job postings indicating manual processes (0-2 points)
  const automationOpportunities = findings.filter(f => 
    f.tags.includes('automation-opportunity')
  ).length;
  if (automationOpportunities > 0) {
    score += Math.min(automationOpportunities * 0.5, 2);
    factors++;
  }
  
  // Factor 2: Company size and growth (0-2 points)
  const hasGrowthSignals = findings.some(f => f.tags.includes('growth'));
  const hasMultipleJobs = context.jobs && context.jobs.length >= 5;
  if (hasGrowthSignals || hasMultipleJobs) {
    score += 1.5;
    factors++;
  }
  
  // Factor 3: Industry and business model (0-2 points)
  const hasRepetitiveTasks = findings.some(f => 
    f.detail.toLowerCase().includes('repetitive') ||
    f.detail.toLowerCase().includes('manual') ||
    f.detail.toLowerCase().includes('high volume')
  );
  if (hasRepetitiveTasks) {
    score += 2;
    factors++;
  }
  
  // Factor 4: Technology adoption indicators (0-2 points)
  const hasTechStack = context.tech && context.tech.length > 0;
  const hasModernTech = context.tech && context.tech.some(t => 
    ['cloud', 'saas', 'api', 'automation'].some(keyword => 
      (t.name || t.product || '').toLowerCase().includes(keyword)
    )
  );
  if (hasTechStack) {
    score += hasModernTech ? 2 : 1;
    factors++;
  }
  
  // Factor 5: Financial indicators (0-2 points)
  const hasProcurement = context.procurement && context.procurement.length > 0;
  const hasHighValueContracts = context.procurement && 
    context.procurement.some(p => (p.amount || 0) > 100000);
  if (hasProcurement) {
    score += hasHighValueContracts ? 2 : 1;
    factors++;
  }
  
  // Calculate final score (0-10 scale)
  const finalScore = factors > 0 ? (score / factors) * 5 : 0;
  
  // Determine confidence based on data availability
  const dataPoints = [
    context.jobs && context.jobs.length > 0,
    context.tech && context.tech.length > 0,
    context.news && context.news.length > 0,
    context.procurement && context.procurement.length > 0,
    findings.length > 5
  ].filter(Boolean).length;
  
  const confidence = Math.min(0.5 + (dataPoints * 0.1), 0.95);
  
  // Determine level
  let level: AutomationScore['level'];
  if (finalScore >= 7) {
    level = 'high-potential';
  } else if (finalScore >= 4) {
    level = 'moderate-potential';
  } else {
    level = 'low-potential';
  }
  
  return {
    score: Math.round(finalScore * 10) / 10,
    confidence,
    level
  };
}