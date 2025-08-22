// Core type definitions for the Lead Generation system

export interface Company {
  name: string;
  domain?: string;
  homepageUrl?: string;
  notes?: string;
}

export interface JobPosting {
  title: string;
  company: string;
  url?: string;
  location?: string;
  date?: string;
  source?: string;
}

export interface ResearchRequest {
  // Option 1: Search by keywords
  keywords?: string;
  location?: string;
  
  // Option 2: Direct company research
  companyName?: string;
  companyUrl?: string;
  
  // Common fields
  notes?: string;
  clientId?: string;
  userId?: string;
}

export interface ResearchJob {
  id: string;
  clientId: string;
  extJobId?: string;
  payload: ResearchRequest;
  result?: ResearchResult;
  status: 'running' | 'done' | 'error';
  createdAt: Date;
}

export interface Finding {
  title: string;
  detail: string;
  confidence: number;
  tags: string[];
  sources: Source[];
}

export interface Source {
  title: string;
  url?: string;
  date?: string;
}

export interface ResearchResult {
  jobId: string;
  model: 'horsemen' | 'opportunity-search';
  summary: string;
  findings: Finding[] | CompanyFindings[];
  meta?: {
    keywords?: string;
    location?: string;
    notes?: string;
  };
}

export interface CompanyFindings {
  company: string;
  jobs: JobPosting[];
  research: Finding[];
}

export interface OsintContext {
  companyName: string;
  domain: string;
  homepageUrl: string;
  corp: any | null;
  news: NewsItem[];
  jobs: JobItem[];
  tech: TechSignal[];
  social: SocialSignal[];
  procurement: ProcurementRecord[];
  archives: ArchiveSnapshot[];
  evidence: Evidence[];
}

export interface NewsItem {
  title: string;
  url?: string;
  date?: string;
}

export interface JobItem {
  title: string;
  url?: string;
  text?: string;
}

export interface TechSignal {
  name?: string;
  product?: string;
  slug?: string;
}

export interface SocialSignal {
  platform: string;
  url: string;
  followers?: number;
}

export interface ProcurementRecord {
  agency: string;
  amount?: number;
  date?: string;
  description?: string;
}

export interface ArchiveSnapshot {
  url: string;
  snapshotUrl: string;
  date: string;
}

export interface Evidence {
  url: string;
  title: string;
}

export interface Opportunity {
  id: string;
  clientId: string;
  title: string;
  url: string;
  source?: string;
  regionCode?: string;
  keywords?: string[];
  status: 'unclaimed' | 'claimed' | 'won' | 'lost';
  claimedBy?: string;
  claimedAt?: Date;
  estMvpValue?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  clientId?: string;
  createdAt: Date;
}

export interface RateLimitConfig {
  dailyCap: number;
  concurrentLimit: number;
  windowMs: number;
}