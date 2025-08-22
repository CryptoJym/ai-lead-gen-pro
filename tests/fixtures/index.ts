// Test fixtures and sample data

export const sampleJobBoards = {
  indeed: {
    name: 'Indeed',
    searchResponse: {
      jobs: [
        {
          id: 'indeed-1',
          title: 'Data Entry Specialist',
          company: 'Acme Corp',
          location: 'New York, NY',
          description: 'Looking for someone to handle manual data entry tasks, process invoices, and manage spreadsheets.',
          url: 'https://indeed.com/job/1',
          postedDate: '2024-01-15',
        },
        {
          id: 'indeed-2',
          title: 'Administrative Assistant',
          company: 'Tech Solutions Inc',
          location: 'San Francisco, CA',
          description: 'Need help with repetitive administrative tasks including email management and scheduling.',
          url: 'https://indeed.com/job/2',
          postedDate: '2024-01-14',
        },
      ],
    },
  },
  linkedin: {
    name: 'LinkedIn',
    searchResponse: {
      jobs: [
        {
          id: 'linkedin-1',
          title: 'Operations Manager',
          company: 'Growth Startup LLC',
          location: 'Austin, TX',
          description: 'Managing manual processes across departments. Looking to streamline operations.',
          url: 'https://linkedin.com/job/1',
          postedDate: '2024-01-13',
        },
      ],
    },
  },
};

export const sampleCompanies = {
  acmeCorp: {
    name: 'Acme Corp',
    url: 'https://acmecorp.com',
    industry: 'Manufacturing',
    size: '100-500',
    techStack: ['Excel', 'QuickBooks', 'Outlook'],
    jobPostings: [sampleJobBoards.indeed.searchResponse.jobs[0]],
    osintData: {
      news: ['Acme Corp reports 20% growth despite manual processes'],
      socialMedia: ['CEO tweets about need for efficiency improvements'],
      techSignals: ['Still using legacy systems', 'No API integrations found'],
    },
  },
  techSolutions: {
    name: 'Tech Solutions Inc',
    url: 'https://techsolutions.com',
    industry: 'Technology',
    size: '50-100',
    techStack: ['Google Workspace', 'Slack', 'Jira'],
    jobPostings: [sampleJobBoards.indeed.searchResponse.jobs[1]],
    osintData: {
      news: ['Tech Solutions raises Series A funding'],
      socialMedia: ['Hiring posts mention scaling challenges'],
      techSignals: ['Modern stack but manual admin processes'],
    },
  },
  growthStartup: {
    name: 'Growth Startup LLC',
    url: 'https://growthstartup.com',
    industry: 'SaaS',
    size: '10-50',
    techStack: ['Notion', 'Airtable', 'Zapier'],
    jobPostings: [sampleJobBoards.linkedin.searchResponse.jobs[0]],
    osintData: {
      news: ['Growth Startup expanding rapidly'],
      socialMedia: ['Team complains about manual onboarding'],
      techSignals: ['Some automation but gaps in operations'],
    },
  },
};

export const sampleResearchResults = {
  opportunitySearch: {
    query: {
      keywords: 'data entry manual process',
      location: 'New York',
      notes: 'Focus on finance sector',
      clientId: 'test-client-id',
    },
    results: {
      totalJobsFound: 25,
      companiesAnalyzed: 5,
      opportunities: [
        {
          company: sampleCompanies.acmeCorp,
          automationScore: 8.5,
          confidence: 0.85,
          opportunities: [
            'Invoice processing automation',
            'Data entry workflow automation',
            'Spreadsheet to database migration',
          ],
          estimatedSavings: '$150,000/year',
          implementation: '3-6 months',
        },
      ],
    },
  },
  deepResearch: {
    query: {
      companyName: 'Acme Corp',
      companyUrl: 'https://acmecorp.com',
      notes: 'Interested in operations automation',
      clientId: 'test-client-id',
    },
    result: {
      company: sampleCompanies.acmeCorp,
      automationAnalysis: {
        score: 8.5,
        confidence: 0.85,
        opportunities: [
          {
            area: 'Invoice Processing',
            impact: 'High',
            effort: 'Medium',
            roi: '6 months',
            description: 'Automate invoice data extraction and entry',
          },
          {
            area: 'Data Management',
            impact: 'High',
            effort: 'Low',
            roi: '3 months',
            description: 'Replace manual spreadsheet work with automated workflows',
          },
        ],
      },
      horsemanAnalysis: {
        brody: {
          score: 8,
          findings: ['Heavy manual data entry', 'No automation tools'],
        },
        karen: {
          score: 9,
          findings: ['B2B model perfect for automation', 'Growing rapidly'],
        },
        durin: {
          score: 8,
          findings: ['Legacy systems', 'No technical debt'],
        },
        kevin: {
          score: 8.5,
          findings: ['Verified pain points', 'Budget available'],
        },
        pinko: {
          score: 8.5,
          findings: ['High ROI opportunity', 'Quick wins available'],
        },
      },
    },
  },
};

export const mockApiResponses = {
  jobBoards: {
    indeed: (keywords: string) => ({
      ok: true,
      json: async () => sampleJobBoards.indeed.searchResponse,
    }),
    linkedin: (keywords: string) => ({
      ok: true,
      json: async () => sampleJobBoards.linkedin.searchResponse,
    }),
  },
  osint: {
    news: (company: string) => ({
      ok: true,
      json: async () => ({
        articles: sampleCompanies.acmeCorp.osintData.news,
      }),
    }),
    social: (company: string) => ({
      ok: true,
      json: async () => ({
        posts: sampleCompanies.acmeCorp.osintData.socialMedia,
      }),
    }),
  },
};