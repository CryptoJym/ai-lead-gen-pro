# AI Lead Gen Pro

> 🚀 AI-powered lead generation system that identifies companies with high automation potential by analyzing job postings and company signals.

## Overview

AI Lead Gen Pro is a complete rewrite of the original Lead-Gen-Program, rebuilt with TypeScript, modern architecture, and enterprise-grade features. It helps identify companies that would benefit most from AI automation by analyzing their job postings, tech stack, and growth signals.

### Key Features

- **🔍 Intelligent Job Analysis**: Searches 12+ job boards to find companies posting roles with automation potential
- **🧠 5-Pass AI Analysis**: Uses the "Horsemen" pattern for comprehensive company evaluation
- **📊 OSINT Data Collection**: Gathers signals from news, social media, tech stack, and more
- **💯 Automation Scoring**: Provides confidence scores and specific automation opportunities
- **🏢 Multi-Tenant Support**: Built for SaaS with rate limiting and tenant isolation
- **⚡ High Performance**: Redis caching, TypeScript, and optimized algorithms
- **📖 OpenAPI Documentation**: Full API documentation with examples
- **🎯 Two Research Modes**: Keyword search for opportunities OR direct company research

## 📋 Quick Start

```bash
# Clone the repository
git clone https://github.com/cryptojym/ai-lead-gen-pro.git
cd ai-lead-gen-pro

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run development server
npm run dev

# Run tests
npm test
```

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│   Research  │────▶│   Horsemen  │
│   API       │     │   Engine    │     │   Analysis  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Redis    │     │  Job Board  │     │    OSINT    │
│    Cache    │     │   Search    │     │ Collection  │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Project Structure

```
src/
├── app/                   # Next.js app directory
│   └── api/              # API routes
├── services/             # Business logic
│   └── research/         # Core research engine
│       ├── engine.ts     # Main orchestrator
│       ├── horsemen/     # 5-pass analysis
│       ├── job-boards.ts # Job search integration
│       └── osint.ts      # OSINT collection
├── lib/                  # Utilities
│   ├── cache.ts         # Redis caching
│   ├── rate-limit.ts    # Rate limiting
│   └── errors.ts        # Error handling
└── types/               # TypeScript definitions
```

## 🔧 API Usage

### 1. Search by Keywords (Find Opportunities)

Find companies posting jobs with high automation potential:

```bash
curl -X POST http://localhost:3000/api/research \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": "data entry manual process",
    "location": "New York",
    "notes": "Focus on finance sector",
    "clientId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### 2. Research Specific Company

Deep dive on a specific company:

```bash
curl -X POST http://localhost:3000/api/research \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme Corp",
    "companyUrl": "https://acmecorp.com",
    "notes": "Interested in operations automation",
    "clientId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### 3. Check Rate Limit Status

```bash
curl -X GET http://localhost:3000/api/status \
  -H "X-Client-ID: 550e8400-e29b-41d4-a716-446655440000"
```

## 🧠 The Horsemen Analysis Pattern

Our unique 5-pass analysis system provides comprehensive insights:

1. **Brody Pass**: Technical analysis and job posting patterns
   - Identifies automation keywords in job descriptions
   - Analyzes tech stack for modernization opportunities
   
2. **Karen Pass**: Business model and market analysis
   - Determines B2B vs B2C focus
   - Evaluates growth trajectories
   
3. **Durin Pass**: Deep technical and infrastructure analysis
   - Reviews procurement data
   - Assesses technical maturity
   
4. **Kevin Pass**: Verification and cross-reference
   - Validates findings across sources
   - Boosts confidence scores
   
5. **Pinko Pass**: Final synthesis and prioritization
   - Generates automation opportunity score (0-10)
   - Provides actionable recommendations

## 💰 Value Proposition

- **Human Cost**: Salary + 30% benefits + 20% turnover = 1.5x salary
- **AI Solution**: 50-75% of annual human cost
- **Typical ROI**: 6-month payback period
- **Benefits**: 24/7 availability, 99.9% accuracy, no turnover

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Next.js
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Testing**: Jest + Playwright
- **Documentation**: OpenAPI 3.0

## 📊 System Capabilities

- Processes up to 50 research jobs per day per tenant
- Supports 3 concurrent jobs per tenant
- Searches across 10+ job boards in parallel
- Analyzes top 5 companies per search
- Provides confidence-scored findings
- Tracks opportunities through sales pipeline

## 🔐 Security

- Admin-only access control
- Bearer token authentication
- Client ID-based multi-tenancy
- Environment variable protection
- Rate limiting and abuse prevention

## 🚀 Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cryptojym/ai-lead-gen-pro)

1. Click the deploy button above
2. Configure environment variables:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`
   - `REDIS_URL` (required for caching and rate limiting)
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` (optional for enhanced analysis)
3. Deploy!

### Environment Variables

```env
# Required
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key
REDIS_URL=redis://your-redis-url:6379

# Optional
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Configuration
DAILY_RESEARCH_CAP_PER_TENANT=50
MAX_CONCURRENT_RESEARCH_JOBS=3
ENABLE_CACHE=true
ENABLE_LLM_SYNTHESIS=true
```

## 📖 Documentation

- [OpenAPI Specification](./openapi.yaml) - Full API documentation
- [Architecture Guide](./docs/architecture/README.md) - System design details
- [Deployment Guide](./docs/deployment/README.md) - Production deployment
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Credits

Original concept by Carl (0rch3strat0r) from the [Lead-Gen-Program](https://github.com/0rch3strat0r/Lead-Gen-Program). 
Rebuilt and enhanced by the [cryptojym](https://github.com/cryptojym) team with:
- Complete TypeScript migration
- Modern architecture patterns
- Enterprise-grade features
- Performance optimizations

---

Built with ❤️ for the AI automation revolution.