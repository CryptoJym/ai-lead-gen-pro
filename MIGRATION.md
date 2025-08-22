# Migration Guide

This guide helps you migrate from the original Lead-Gen-Program to AI Lead Gen Pro.

## What's Changed

### Architecture Improvements

1. **TypeScript**: Full type safety throughout the codebase
2. **Modern Framework**: Next.js 14 with App Router
3. **Better Organization**: Clear separation of concerns
4. **Error Handling**: Comprehensive error classes and handlers
5. **Caching**: Redis-based caching for performance
6. **Rate Limiting**: Built-in multi-tenant rate limiting

### API Changes

#### Endpoint Changes
- Old: `/api/research/run.js`
- New: `/api/research` (POST)

#### Request Format
Both keyword search and company research use the same endpoint:

```typescript
// Old format (two separate flows)
{
  // Either keyword search
  keywords: "data entry",
  location: "Utah"
}
// OR company research
{
  companyName: "Acme Corp",
  companyUrl: "https://acme.com"
}

// New format (unified)
{
  // For keyword search
  keywords: "data entry manual process",
  location: "New York",
  notes: "Focus on finance",
  clientId: "uuid-here"
}
// OR for company research
{
  companyName: "Acme Corp",
  companyUrl: "https://acme.com",
  notes: "Interested in operations",
  clientId: "uuid-here"
}
```

#### Response Format
The response structure remains similar but with enhanced typing:

```typescript
{
  success: true,
  data: {
    jobId: string,
    model: "horsemen" | "opportunity-search",
    summary: string,
    findings: Finding[] | CompanyFindings[]
  }
}
```

### Environment Variables

New required variables:
- `REDIS_URL` - Required for caching and rate limiting
- `ENABLE_CACHE` - Toggle caching (default: true)
- `ENABLE_LLM_SYNTHESIS` - Toggle AI synthesis (default: true)

### Database Schema

The database schema remains compatible. No migration needed for existing data.

## Migration Steps

### 1. Update Dependencies

```bash
# Remove old dependencies
npm uninstall express body-parser

# Install new dependencies
npm install
```

### 2. Update Environment Variables

Add to your `.env`:
```env
REDIS_URL=redis://localhost:6379
ENABLE_CACHE=true
ENABLE_LLM_SYNTHESIS=true
```

### 3. Update API Calls

Update your client code to use the new endpoint:

```javascript
// Old
const response = await fetch('/api/research/run.js', {
  method: 'POST',
  body: JSON.stringify({ keywords, location })
});

// New
const response = await fetch('/api/research', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ 
    keywords, 
    location,
    clientId: 'your-client-id'
  })
});
```

### 4. TypeScript Integration

If you're using TypeScript, import the types:

```typescript
import { 
  ResearchRequest, 
  ResearchResult, 
  Finding 
} from 'ai-lead-gen-pro/types';
```

### 5. Rate Limiting

The new system enforces rate limits per client:
- 50 requests per day per client
- 3 concurrent requests per client

Make sure to handle 429 responses:

```javascript
if (response.status === 429) {
  const error = await response.json();
  console.log('Rate limited. Retry after:', error.retryAfter);
}
```

## Breaking Changes

1. **Required Client ID**: All requests now require a `clientId` for multi-tenancy
2. **Unified Endpoint**: Single `/api/research` endpoint instead of multiple
3. **Redis Required**: Redis is now required for caching and rate limiting
4. **TypeScript Types**: Response types are now strictly typed

## Rollback Plan

If you need to rollback:
1. Keep the original repository as backup
2. Database is backward compatible
3. Can run both versions side-by-side on different ports

## Support

For migration support:
- Open an issue on GitHub
- Check the [FAQ](./docs/FAQ.md)
- Review the [API Documentation](./openapi.yaml)