import { Finding } from '@/types';

export async function synthesizeFindings(findings: Finding[]): Promise<string> {
  if (findings.length === 0) {
    return 'No significant findings identified.';
  }
  
  // Group findings by category
  const categories = {
    opportunities: findings.filter(f => 
      f.tags.includes('automation-opportunity') || 
      f.tags.includes('high-impact')
    ),
    techStack: findings.filter(f => 
      f.tags.includes('tech-stack') || 
      f.tags.includes('tech-gap') ||
      f.tags.includes('legacy-tech')
    ),
    growth: findings.filter(f => 
      f.tags.includes('growth') || 
      f.tags.includes('scaling') ||
      f.tags.includes('hiring')
    ),
    businessModel: findings.filter(f => 
      f.tags.includes('business-model') || 
      f.tags.includes('b2b') ||
      f.tags.includes('b2c')
    )
  };
  
  // Build synthesis
  const parts: string[] = [];
  
  // Overall assessment
  const highConfidenceCount = findings.filter(f => f.confidence >= 0.8).length;
  const avgConfidence = findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length;
  
  parts.push(`Analyzed ${findings.length} data points with ${Math.round(avgConfidence * 100)}% average confidence.`);
  
  // Opportunities
  if (categories.opportunities.length > 0) {
    parts.push(`Identified ${categories.opportunities.length} automation opportunities.`);
    const topOpp = categories.opportunities[0];
    parts.push(`Key opportunity: ${topOpp.title}.`);
  }
  
  // Tech readiness
  if (categories.techStack.length > 0) {
    const hasModern = categories.techStack.some(f => f.tags.includes('modern-tech'));
    const hasLegacy = categories.techStack.some(f => f.tags.includes('legacy-tech'));
    
    if (hasModern && !hasLegacy) {
      parts.push('Modern tech stack indicates high readiness for AI adoption.');
    } else if (hasLegacy) {
      parts.push('Legacy systems present opportunities for modernization.');
    }
  }
  
  // Growth indicators
  if (categories.growth.length > 0) {
    const growthLevel = categories.growth.find(f => f.title.includes('Growth'))?.title || 'Growth detected';
    parts.push(`${growthLevel} creates urgency for scalable solutions.`);
  }
  
  // Business model insights
  if (categories.businessModel.length > 0) {
    const model = categories.businessModel[0];
    parts.push(`${model.title.replace(' Detected', '')} with specific automation needs.`);
  }
  
  return parts.join(' ');
}