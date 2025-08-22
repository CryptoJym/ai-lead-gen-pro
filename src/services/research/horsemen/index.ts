import { Finding, OsintContext } from '@/types';
import { analyzeTechStack } from './analyzers/tech-stack';
import { analyzeJobPostings } from './analyzers/job-postings';
import { analyzeBusinessModel } from './analyzers/business-model';
import { analyzeGrowthSignals } from './analyzers/growth-signals';
import { analyzeAutomationPotential } from './analyzers/automation-potential';
import {
  brodyPassEnhanced,
  karenPassEnhanced,
  durinPassEnhanced,
  kevinPassEnhanced,
  pinkoPassEnhanced
} from './llm-enhanced';

// Brody Pass: Technical analysis and job posting patterns
export async function brodyPass(context: OsintContext): Promise<Finding[]> {
  // Use LLM-enhanced analysis if available
  if (process.env.LLM_PROVIDER) {
    try {
      return await brodyPassEnhanced(context);
    } catch (error) {
      console.error('LLM analysis failed, falling back to pattern matching:', error);
    }
  }
  
  // Fallback to pattern-based analysis
  const findings: Finding[] = [];
  
  // Analyze tech stack
  const techFindings = await analyzeTechStack(context);
  findings.push(...techFindings);
  
  // Analyze job postings for automation opportunities
  const jobFindings = await analyzeJobPostings(context);
  findings.push(...jobFindings);
  
  return findings;
}

// Karen Pass: Business model and market analysis
export async function karenPass(context: OsintContext): Promise<Finding[]> {
  // Use LLM-enhanced analysis if available
  if (process.env.LLM_PROVIDER) {
    try {
      return await karenPassEnhanced(context);
    } catch (error) {
      console.error('LLM analysis failed, falling back to pattern matching:', error);
    }
  }
  
  // Fallback to pattern-based analysis
  const findings: Finding[] = [];
  
  // Business model analysis
  const businessFindings = await analyzeBusinessModel(context);
  findings.push(...businessFindings);
  
  // Growth and scaling signals
  const growthFindings = await analyzeGrowthSignals(context);
  findings.push(...growthFindings);
  
  return findings;
}

// Durin Pass: Deep technical and infrastructure analysis
export async function durinPass(context: OsintContext): Promise<Finding[]> {
  // Use LLM-enhanced analysis if available
  if (process.env.LLM_PROVIDER) {
    try {
      return await durinPassEnhanced(context);
    } catch (error) {
      console.error('LLM analysis failed, falling back to pattern matching:', error);
    }
  }
  
  // Fallback to pattern-based analysis
  const findings: Finding[] = [];
  
  // Infrastructure and scaling needs
  if (context.tech && context.tech.length > 0) {
    findings.push({
      title: 'Technical Infrastructure Assessment',
      detail: `Current stack includes ${context.tech.map(t => t.name || t.product).join(', ')}. Opportunities for automation and optimization identified.`,
      confidence: 0.75,
      tags: ['tech-stack', 'infrastructure'],
      sources: context.tech.map(t => ({
        title: `Tech: ${t.name || t.product}`,
        url: t.slug ? `https://stackshare.io/companies/${context.companyName}` : undefined
      }))
    });
  }
  
  // Procurement and government contracts
  if (context.procurement && context.procurement.length > 0) {
    const totalValue = context.procurement.reduce((sum, p) => sum + (p.amount || 0), 0);
    findings.push({
      title: 'Government Contract Holder',
      detail: `Active in government procurement with ${context.procurement.length} contracts worth $${totalValue.toLocaleString()}. Strong indicator of process maturity.`,
      confidence: 0.9,
      tags: ['procurement', 'enterprise', 'high-value'],
      sources: context.procurement.map(p => ({
        title: `${p.agency} Contract`,
        date: p.date
      }))
    });
  }
  
  return findings;
}

// Kevin Pass: Verification and cross-reference
export async function kevinPass(context: OsintContext, preliminary: Finding[]): Promise<Finding[]> {
  // Use LLM-enhanced verification if available
  if (process.env.LLM_PROVIDER) {
    try {
      return await kevinPassEnhanced(context, preliminary);
    } catch (error) {
      console.error('LLM verification failed, falling back to rule-based:', error);
    }
  }
  
  // Fallback to rule-based verification
  const verified = preliminary.filter(finding => {
    // Remove low confidence findings without corroboration
    if (finding.confidence < 0.5 && finding.sources.length < 2) {
      return false;
    }
    
    // Boost confidence for findings with multiple sources
    if (finding.sources.length >= 3) {
      finding.confidence = Math.min(finding.confidence * 1.2, 1.0);
    }
    
    return true;
  });
  
  // Cross-reference and deduplicate
  const unique = new Map<string, Finding>();
  verified.forEach(finding => {
    const key = `${finding.title}-${finding.tags.join('-')}`;
    const existing = unique.get(key);
    
    if (!existing || finding.confidence > existing.confidence) {
      unique.set(key, finding);
    }
  });
  
  return Array.from(unique.values());
}

// Pinko Pass: Final synthesis and prioritization
export async function pinkoPass(context: OsintContext, verified: Finding[]): Promise<Finding[]> {
  // Use LLM-enhanced synthesis if available
  if (process.env.LLM_PROVIDER) {
    try {
      return await pinkoPassEnhanced(context, verified);
    } catch (error) {
      console.error('LLM synthesis failed, falling back to rule-based:', error);
    }
  }
  
  // Fallback to rule-based synthesis
  // Calculate automation potential score
  const automationScore = await analyzeAutomationPotential(context, verified);
  
  // Add synthesis finding
  const synthesis: Finding = {
    title: 'Overall Automation Opportunity Assessment',
    detail: generateSynthesis(context, verified, automationScore),
    confidence: automationScore.confidence,
    tags: ['synthesis', 'recommendation', automationScore.level],
    sources: [{
      title: 'Comprehensive Analysis',
      date: new Date().toISOString().split('T')[0]
    }]
  };
  
  // Sort by impact and confidence
  const prioritized = [...verified, synthesis].sort((a, b) => {
    const aScore = a.confidence * (a.tags.includes('high-impact') ? 1.5 : 1);
    const bScore = b.confidence * (b.tags.includes('high-impact') ? 1.5 : 1);
    return bScore - aScore;
  });
  
  return prioritized;
}

function generateSynthesis(
  context: OsintContext, 
  findings: Finding[], 
  automationScore: { score: number; confidence: number; level: string }
): string {
  const opportunities = findings.filter(f => 
    f.tags.includes('automation-opportunity') || 
    f.tags.includes('high-impact')
  ).length;
  
  const hasJobs = context.jobs && context.jobs.length > 0;
  const hasTech = context.tech && context.tech.length > 0;
  const hasGrowth = findings.some(f => f.tags.includes('growth'));
  
  let summary = `${context.companyName} shows ${automationScore.level} potential for AI automation (score: ${automationScore.score}/10). `;
  
  if (opportunities > 0) {
    summary += `Identified ${opportunities} specific automation opportunities. `;
  }
  
  if (hasJobs) {
    summary += `Active hiring indicates growth and potential for process optimization. `;
  }
  
  if (hasTech) {
    summary += `Existing tech stack suggests openness to technology adoption. `;
  }
  
  if (hasGrowth) {
    summary += `Growth signals indicate scaling challenges that AI could address. `;
  }
  
  return summary;
}