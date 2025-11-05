# Getting Started with AI Lead Gen Pro

Welcome to AI Lead Gen Pro! This guide will help you get up and running quickly.

## 🚀 Quick Start (5 Minutes)

### Option 1: Docker (Easiest)

The fastest way to try AI Lead Gen Pro:

```bash
# Clone the repository
git clone https://github.com/CryptoJym/ai-lead-gen-pro.git
cd ai-lead-gen-pro

# Start all services
docker-compose up -d

# Check status
curl http://localhost:3000/api/status

# Try a research query (development mode allows anonymous access)
curl -X POST http://localhost:3000/api/research \
  -H "Content-Type: application/json" \
  -H "X-Client-ID: dev-client" \
  -d '{
    "keywords": "data entry automation",
    "location": "New York"
  }'
```

That's it! You now have:
- ✅ AI Lead Gen Pro running on http://localhost:3000
- ✅ PostgreSQL database on port 5432
- ✅ Redis cache on port 6379

### Option 2: Local Development

If you prefer running without Docker:

```bash
# Clone the repository
git clone https://github.com/CryptoJym/ai-lead-gen-pro.git
cd ai-lead-gen-pro

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Edit .env - at minimum, set:
# - DATABASE_URL (PostgreSQL connection string)
# - ALLOW_ANONYMOUS=true (for development)

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

Visit http://localhost:3000 to see the application.

## 📖 Understanding the System

### What Does It Do?

AI Lead Gen Pro helps you find companies that need AI automation by:

1. **Searching Job Boards**: Finds companies posting jobs with automation potential
2. **Analyzing Companies**: Deep analysis of tech stack, business model, and growth signals
3. **Scoring Opportunities**: Provides 0-10 automation potential scores with confidence ratings
4. **Multi-Source OSINT**: Gathers data from news, social media, tech databases, and more

### Two Research Modes

**Mode 1: Opportunity Search**
- Input: Keywords (e.g., "manual data entry")
- Output: List of companies with matching job postings
- Use case: Finding new leads

**Mode 2: Deep Company Research**
- Input: Company name or URL
- Output: Comprehensive analysis of automation opportunities
- Use case: Qualifying specific leads

## 🔑 Authentication

### Development Mode (Easy)

For testing and development, use the `X-Client-ID` header:

```bash
curl -X POST http://localhost:3000/api/research \
  -H "X-Client-ID: your-client-id" \
  -H "Content-Type: application/json" \
  -d '{"keywords": "automation"}'
```

Set `ALLOW_ANONYMOUS=true` in your .env file for even easier testing.

### Production Mode (Secure)

For production, use API Key authentication:

```bash
curl -X POST https://your-domain.com/api/research \
  -H "X-API-Key: your-secret-api-key" \
  -H "Content-Type: application/json" \
  -d '{"keywords": "automation"}'
```

See [SECURITY.md](./SECURITY.md) for detailed authentication setup.

## 📊 Example Usage

### 1. Search for Companies with Automation Potential

```bash
curl -X POST http://localhost:3000/api/research \
  -H "X-Client-ID: dev-client" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": "manual data entry spreadsheets",
    "location": "San Francisco",
    "notes": "Focus on finance and healthcare"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "dev-client",
    "model": "opportunity-search",
    "summary": "Found 45 job postings across 12 companies...",
    "findings": [
      {
        "company": "Acme Financial Corp",
        "jobs": [...],
        "research": [
          {
            "title": "High Manual Data Processing Load",
            "detail": "Company posts multiple positions for data entry...",
            "confidence": 0.85,
            "tags": ["automation-opportunity", "data-processing"],
            "sources": [...]
          }
        ]
      }
    ]
  }
}
```

### 2. Deep Dive on Specific Company

```bash
curl -X POST http://localhost:3000/api/research \
  -H "X-Client-ID: dev-client" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme Corp",
    "companyUrl": "https://acmecorp.com",
    "notes": "Referred by mutual contact"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "dev-client",
    "model": "horsemen",
    "summary": "Acme Corp shows strong automation potential (8.5/10)...",
    "findings": [
      {
        "title": "Legacy Tech Stack Modernization Opportunity",
        "detail": "Uses older systems that could benefit from AI...",
        "confidence": 0.92,
        "tags": ["tech-modernization", "legacy-systems"],
        "sources": [...]
      },
      {
        "title": "Rapid Growth Phase (75 new hires in 6 months)",
        "detail": "Fast growth indicates scaling challenges...",
        "confidence": 0.88,
        "tags": ["growth-signal", "scaling"],
        "sources": [...]
      }
    ]
  }
}
```

### 3. Check Your Rate Limits

```bash
curl http://localhost:3000/api/status \
  -H "X-Client-ID: dev-client"
```

**Response:**
```json
{
  "status": "operational",
  "version": "2.0.0",
  "rateLimit": {
    "dailyUsed": 5,
    "dailyLimit": 50,
    "dailyRemaining": 45,
    "concurrentUsed": 0,
    "concurrentLimit": 3,
    "resetAt": "2025-11-06T00:00:00.000Z"
  },
  "cache": {
    "type": "redis",
    "connected": true
  },
  "health": {
    "api": "healthy",
    "cache": "redis",
    "database": "healthy"
  }
}
```

## 🎯 Understanding the Results

### Findings Structure

Each finding includes:

- **title**: Brief description of the opportunity
- **detail**: In-depth explanation
- **confidence**: 0.0-1.0 score (higher is more certain)
- **tags**: Categorization tags
- **sources**: Where the data came from

### Common Tags

- `automation-opportunity`: Direct automation potential identified
- `tech-modernization`: Legacy tech that could be upgraded
- `growth-signal`: Company is scaling
- `manual-process`: Labor-intensive processes detected
- `b2b-focus`: B2B company (better fit for enterprise software)
- `government-contractor`: Works with government (longer sales cycles)

### Confidence Scores

- **0.9-1.0**: Very high confidence - multiple sources confirm
- **0.75-0.89**: High confidence - strong signals
- **0.6-0.74**: Medium confidence - some indicators
- **Below 0.6**: Low confidence - weak signals

## 🛠️ Configuration

### Essential Environment Variables

```env
# Database (Required)
DATABASE_URL=postgresql://user:password@localhost:5432/ai_lead_gen_pro

# Authentication (Required for production)
API_KEY=your-secure-api-key
JWT_SECRET=your-jwt-secret

# Security (Required for production)
ALLOWED_ORIGINS=https://yourdomain.com
ALLOW_ANONYMOUS=false  # Set to true for development

# Redis (Optional - uses in-memory if not set)
REDIS_URL=redis://localhost:6379

# Rate Limiting (Optional)
DAILY_RESEARCH_CAP_PER_TENANT=50
MAX_CONCURRENT_RESEARCH_JOBS=3
```

### Optional External APIs

For enhanced data collection:

```env
NEWS_API_KEY=your-newsapi-key      # Company news
SERP_API_KEY=your-serpapi-key      # Google search results
BUILTWITH_API_KEY=your-key         # Tech stack detection
SAM_GOV_API_KEY=your-key           # Government contracts
```

## 🚀 Deployment

### Deploy to Vercel (Easiest Cloud Deploy)

1. Fork the repository on GitHub
2. Sign up for [Vercel](https://vercel.com)
3. Import your forked repository
4. Add environment variables
5. Deploy!

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Deploy with Docker (Any Server)

```bash
# Production deployment
docker build -t ai-lead-gen-pro .
docker run -p 3000:3000 --env-file .env.production ai-lead-gen-pro
```

See [DOCKER.md](./DOCKER.md) for detailed Docker deployment.

## 📚 Next Steps

1. **Read the Documentation**
   - [README.md](./README.md) - Overview and architecture
   - [SECURITY.md](./SECURITY.md) - Security best practices
   - [DOCKER.md](./DOCKER.md) - Docker deployment guide
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment

2. **Customize for Your Use Case**
   - Adjust rate limits in .env
   - Configure CORS origins
   - Set up external API keys
   - Customize the Horsemen analysis passes

3. **Integrate with Your Workflow**
   - Build a UI on top of the API
   - Integrate with CRM (Salesforce, HubSpot)
   - Set up automated email outreach
   - Create Slack notifications

4. **Monitor and Optimize**
   - Watch rate limit usage
   - Monitor cache hit rates
   - Track API response times
   - Analyze finding quality

## 🤝 Support

- **Documentation**: See the docs/ directory
- **Issues**: https://github.com/CryptoJym/ai-lead-gen-pro/issues
- **Security**: See SECURITY.md for reporting vulnerabilities
- **Community**: Join our Discord (link in README)

## 🎉 Success Stories

After you've had success with AI Lead Gen Pro, we'd love to hear about it! Share your story:
- GitHub Discussions
- Twitter: @CryptoJym
- LinkedIn: CryptoJym

Happy lead hunting! 🎯
