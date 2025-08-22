# AI Lead Gen Pro - Deployment Guide

## Overview

AI Lead Gen Pro is a TypeScript-based lead generation system that uses AI analysis and web scraping to identify automation opportunities in businesses. The system can be deployed locally or in the cloud.

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+ (or Supabase account)
- Playwright browsers (installed automatically)
- Optional: Redis for caching (falls back to in-memory if not available)
- Optional: Local LLM (OSS 120B) or API keys for OpenAI/Anthropic

## Local Installation

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/yourusername/ai-lead-gen-pro.git
cd ai-lead-gen-pro
npm install
```

### 2. Configure Environment

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Key configurations:

```env
# Database (required)
DATABASE_URL=postgresql://user:password@localhost:5432/ai_lead_gen_pro

# Redis (optional - uses in-memory cache if not set)
# REDIS_URL=redis://localhost:6379

# LLM Configuration
LLM_PROVIDER=local
LOCAL_LLM_ENDPOINT=http://localhost:11434/v1
LOCAL_LLM_MODEL=oss-120b

# Enable real scraping
USE_REAL_SCRAPING=true

# API Keys (optional but recommended)
NEWS_API_KEY=your-key
SERP_API_KEY=your-key
BUILTWITH_API_KEY=your-key
```

### 3. Set Up Database

```bash
# Create database
createdb ai_lead_gen_pro

# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 4. Install Playwright Browsers

```bash
npx playwright install chromium
```

### 5. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Production Deployment

### Option 1: Vercel Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Set environment variables in Vercel dashboard.

### Option 2: Docker Deployment

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

# Install Playwright dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t ai-lead-gen-pro .
docker run -p 3000:3000 --env-file .env ai-lead-gen-pro
```

### Option 3: Traditional VPS

1. Set up Node.js environment
2. Install PostgreSQL and Redis (optional)
3. Clone repository
4. Install dependencies: `npm ci --production`
5. Build: `npm run build`
6. Use PM2 for process management:

```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

Example `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'ai-lead-gen-pro',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster'
  }]
};
```

## Local LLM Setup (OSS 120B)

For best results with local deployment, use the OSS 120B model:

### 1. Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Pull OSS 120B Model

```bash
ollama pull oss-120b
```

### 3. Run Ollama Server

```bash
ollama serve
```

### 4. Configure Environment

```env
LLM_PROVIDER=local
LOCAL_LLM_ENDPOINT=http://localhost:11434/v1
LOCAL_LLM_MODEL=oss-120b
```

## API Usage

### Research Endpoint

```bash
POST /api/research
Content-Type: application/json

# Opportunity Search
{
  "keywords": "data entry automation",
  "location": "Remote",
  "clientId": "your-client-id"
}

# Deep Company Research
{
  "companyName": "TechCorp",
  "companyUrl": "https://techcorp.com",
  "notes": "Focus on e-commerce automation"
}
```

### Status Check

```bash
GET /api/status
```

## Monitoring

### Health Checks

- API Status: `/api/status`
- Database: Check PostgreSQL connection
- Cache: Redis ping (if using)
- Scraping: Monitor Playwright browser instances

### Logs

- Application logs: `npm run logs`
- Error tracking: Configure Sentry (optional)
- Performance: Use Application Insights or similar

## Security Considerations

1. **API Authentication**: Use bearer tokens for API access
2. **Rate Limiting**: Configure per-client limits
3. **Database**: Use connection pooling and SSL
4. **Scraping**: Respect robots.txt and implement delays
5. **Environment**: Never commit `.env` files

## Troubleshooting

### Common Issues

1. **Playwright fails to launch**
   - Ensure system dependencies are installed
   - Check `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` is not set
   - Run `npx playwright install-deps`

2. **Database connection errors**
   - Verify PostgreSQL is running
   - Check connection string format
   - Ensure database exists

3. **LLM not responding**
   - Verify Ollama is running
   - Check endpoint URL
   - Test with: `curl http://localhost:11434/api/tags`

4. **Scraping blocked**
   - Rotate user agents
   - Add delays between requests
   - Use proxy rotation (advanced)

## Performance Optimization

1. **Caching**: Use Redis for production
2. **Database**: Add indexes for common queries
3. **Scraping**: Limit concurrent browser instances
4. **LLM**: Use GPU acceleration for local models

## Maintenance

- Update dependencies: `npm update`
- Database migrations: `npm run db:migrate`
- Clear cache: `npm run cache:clear`
- Rotate logs: Configure logrotate

## Support

For issues and questions:
- GitHub Issues: [your-repo/issues]
- Documentation: [your-docs-site]
- Email: support@your-domain.com