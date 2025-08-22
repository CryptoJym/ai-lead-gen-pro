import { Finding, OsintContext } from '@/types';
import { getLLMProvider } from '@/lib/llm';

// Enhanced Horsemen passes using local LLM

export async function brodyPassEnhanced(context: OsintContext): Promise<Finding[]> {
  const llm = getLLMProvider();
  
  // Technical analysis with LLM
  const techPrompt = `Analyze this company's technical profile for automation opportunities:

Company: ${context.companyName}
Domain: ${context.domain}
Tech Stack: ${context.tech.map(t => t.name || t.product).join(', ')}
Job Postings: ${context.jobs.length} open positions
Job Titles: ${context.jobs.slice(0, 10).map(j => j.title).join(', ')}

Focus on:
1. Technology gaps that could benefit from AI/automation
2. Manual processes evident in job postings
3. Legacy systems that need modernization
4. Integration opportunities

Provide specific, actionable findings.`;

  const techAnalysis = await llm.analyzeContext(context, techPrompt);
  
  // Analyze job postings for patterns
  const jobPrompt = `Analyze these job postings to identify automation opportunities:

${context.jobs.slice(0, 20).map((job, i) => `
${i + 1}. ${job.title} at ${job.company}
   Location: ${job.location}
   ${job.text ? `Description excerpt: ${job.text.substring(0, 200)}...` : ''}
`).join('\n')}

Identify:
1. Repetitive tasks mentioned across multiple roles
2. Manual processes that could be automated
3. High-volume operations
4. Data entry or processing roles
5. Coordination/scheduling tasks

For each pattern found, estimate the potential impact and feasibility of automation.`;

  const jobAnalysis = await llm.analyzeContext(context, jobPrompt);
  
  // Extract findings
  const findings: Finding[] = [];
  
  // Tech findings
  const techFindings = await llm.extractFindings(techAnalysis);
  findings.push(...techFindings.map(f => ({
    ...f,
    tags: [...(f.tags || []), 'tech-analysis', 'brody-pass']
  })));
  
  // Job findings
  const jobFindings = await llm.extractFindings(jobAnalysis);
  findings.push(...jobFindings.map(f => ({
    ...f,
    tags: [...(f.tags || []), 'job-analysis', 'brody-pass']
  })));
  
  return findings;
}

export async function karenPassEnhanced(context: OsintContext): Promise<Finding[]> {
  const llm = getLLMProvider();
  
  // Business model and market analysis
  const businessPrompt = `Analyze this company's business model and market position:

Company: ${context.companyName}
Industry: ${context.corp?.industry || 'Unknown'}
News Headlines: ${context.news.slice(0, 5).map(n => n.title).join('; ')}
Social Presence: ${context.social.map(s => `${s.platform}: ${s.followers || 'N/A'} followers`).join(', ')}
Employees: ${context.corp?.employees || 'Unknown'}

Analyze:
1. Business model type (B2B, B2C, marketplace, etc.)
2. Growth indicators and scaling challenges
3. Competitive pressures requiring efficiency
4. Customer service or operational bottlenecks
5. Market opportunities for AI differentiation

Provide insights on where AI could provide competitive advantage.`;

  const businessAnalysis = await llm.analyzeContext(context, businessPrompt);
  
  // Growth and scaling analysis
  const growthPrompt = `Based on this company's profile, analyze growth and scaling opportunities:

Recent News:
${context.news.slice(0, 10).map(n => `- ${n.title} (${n.source})`).join('\n')}

Job Growth: ${context.jobs.length} open positions
High-demand roles: ${getMostCommonRoles(context.jobs).join(', ')}

Identify:
1. Growth trajectory and scaling challenges
2. Operational bottlenecks from rapid growth
3. Need for scalable solutions
4. Process standardization opportunities
5. Customer experience improvement areas`;

  const growthAnalysis = await llm.analyzeContext(context, growthPrompt);
  
  const findings = await Promise.all([
    llm.extractFindings(businessAnalysis),
    llm.extractFindings(growthAnalysis)
  ]);
  
  return findings.flat().map(f => ({
    ...f,
    tags: [...(f.tags || []), 'business-analysis', 'karen-pass']
  }));
}

export async function durinPassEnhanced(context: OsintContext): Promise<Finding[]> {
  const llm = getLLMProvider();
  
  // Deep infrastructure and process analysis
  const infraPrompt = `Perform deep technical and infrastructure analysis:

Company: ${context.companyName}
Tech Stack Details:
${context.tech.map(t => `- ${t.name}: ${t.category} (${t.description || 'N/A'})`).join('\n')}

Archive History: ${context.archives.length} snapshots
Procurement: ${context.procurement.length > 0 ? 'Government contractor' : 'No government contracts'}

Analyze:
1. Infrastructure modernization needs
2. Data management and analytics gaps
3. Security and compliance automation opportunities
4. Integration and API opportunities
5. Cloud migration or optimization potential
6. DevOps and deployment automation needs

Focus on high-impact, high-ROI opportunities.`;

  const analysis = await llm.analyzeContext(context, infraPrompt);
  const findings = await llm.extractFindings(analysis);
  
  // Add procurement insights if applicable
  if (context.procurement.length > 0) {
    findings.push({
      title: 'Government Contractor Status',
      detail: `Company has ${context.procurement.length} government contracts, indicating mature processes and compliance needs. Strong opportunity for compliance automation and reporting systems.`,
      confidence: 0.9,
      tags: ['procurement', 'compliance', 'high-value', 'durin-pass'],
      sources: context.procurement.map(p => ({
        title: `${p.agency} Contract`,
        date: p.date
      }))
    });
  }
  
  return findings.map(f => ({
    ...f,
    tags: [...(f.tags || []), 'infrastructure', 'durin-pass']
  }));
}

export async function kevinPassEnhanced(context: OsintContext, preliminary: Finding[]): Promise<Finding[]> {
  const llm = getLLMProvider();
  
  // Verification and cross-reference
  const verifyPrompt = `Review and verify these preliminary findings for accuracy and impact:

${preliminary.slice(0, 15).map((f, i) => `
Finding ${i + 1}: ${f.title}
Detail: ${f.detail}
Confidence: ${f.confidence}
Tags: ${f.tags.join(', ')}
`).join('\n')}

For each finding:
1. Verify against the company profile and data
2. Assess realistic implementation difficulty
3. Estimate potential ROI (high/medium/low)
4. Flag any contradictions or concerns
5. Suggest priority order

Return verified findings with adjusted confidence scores and implementation notes.`;

  const verification = await llm.analyzeContext(context, verifyPrompt);
  
  // Manual verification logic
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
    const key = `${finding.title}-${finding.tags.sort().join('-')}`;
    const existing = unique.get(key);
    
    if (!existing || finding.confidence > existing.confidence) {
      unique.set(key, finding);
    }
  });
  
  return Array.from(unique.values());
}

export async function pinkoPassEnhanced(context: OsintContext, verified: Finding[]): Promise<Finding[]> {
  const llm = getLLMProvider();
  
  // Final synthesis and recommendations
  const synthesisPrompt = `Create a comprehensive automation strategy based on these findings:

Company: ${context.companyName}
Verified Opportunities: ${verified.length}
Top Findings:
${verified.slice(0, 10).map(f => `- ${f.title}: ${f.detail}`).join('\n')}

Create:
1. Executive summary of automation potential (1-10 score with justification)
2. Top 3 quick wins (low effort, high impact)
3. Strategic initiatives (high effort, transformational impact)
4. Implementation roadmap suggestion
5. Expected ROI and timeline estimates

Be specific and actionable. Focus on realistic outcomes.`;

  const synthesis = await llm.analyzeContext(context, synthesisPrompt);
  
  // Extract automation score
  const scoreMatch = synthesis.match(/score[:\s]+(\d+)/i);
  const automationScore = scoreMatch ? parseInt(scoreMatch[1]) : 7;
  
  // Create synthesis finding
  const synthesisFinding: Finding = {
    title: 'Comprehensive Automation Strategy',
    detail: synthesis,
    confidence: 0.9,
    tags: ['synthesis', 'recommendation', 'executive-summary'],
    sources: [{
      title: 'AI Analysis Synthesis',
      date: new Date().toISOString().split('T')[0]
    }]
  };
  
  // Prioritize findings
  const prioritized = [...verified, synthesisFinding].sort((a, b) => {
    // Synthesis first
    if (a.tags.includes('synthesis')) return -1;
    if (b.tags.includes('synthesis')) return 1;
    
    // Then by impact and confidence
    const aScore = a.confidence * (a.tags.includes('high-impact') ? 1.5 : 1) * 
                   (a.tags.includes('quick-win') ? 1.3 : 1);
    const bScore = b.confidence * (b.tags.includes('high-impact') ? 1.5 : 1) * 
                   (b.tags.includes('quick-win') ? 1.3 : 1);
    return bScore - aScore;
  });
  
  // Add automation score as metadata
  prioritized.forEach(finding => {
    if (!finding.metadata) finding.metadata = {};
    finding.metadata.automationScore = automationScore;
  });
  
  return prioritized;
}

// Helper function
function getMostCommonRoles(jobs: OsintContext['jobs']): string[] {
  const roleCounts = new Map<string, number>();
  
  jobs.forEach(job => {
    const role = job.title.split(/[-–]/)[0].trim();
    roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
  });
  
  return Array.from(roleCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([role]) => role);
}