# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Authentication

AI Lead Gen Pro supports multiple authentication methods:

### 1. API Key Authentication

Recommended for server-to-server communication.

```bash
curl -X POST https://your-domain.com/api/research \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"keywords": "automation", "location": "New York"}'
```

### 2. Bearer Token (JWT)

Recommended for user-facing applications.

```bash
curl -X POST https://your-domain.com/api/research \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"companyName": "Acme Corp"}'
```

### 3. Client ID Header

For development and testing.

```bash
curl -X POST http://localhost:3000/api/research \
  -H "X-Client-ID: your-client-uuid" \
  -H "Content-Type: application/json" \
  -d '{"keywords": "data entry"}'
```

## Security Best Practices

### Environment Variables

**Never commit sensitive credentials to version control.**

Required secure environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token signing
- `API_KEY` - API key for client authentication
- `REDIS_URL` - Redis connection string (if using)

Optional API keys (for data collection):
- `NEWS_API_KEY`
- `SERP_API_KEY`
- `BUILTWITH_API_KEY`
- `SAM_GOV_API_KEY`

### CORS Configuration

Configure `ALLOWED_ORIGINS` environment variable to restrict cross-origin requests:

```env
# Production - specific domains only
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Development - localhost
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Wildcard subdomain (use with caution)
ALLOWED_ORIGINS=*.yourdomain.com
```

**Warning:** Never use `ALLOWED_ORIGINS=*` in production.

### Rate Limiting

Configure rate limits per tenant:

```env
DAILY_RESEARCH_CAP_PER_TENANT=50      # Max requests per day
MAX_CONCURRENT_RESEARCH_JOBS=3         # Max simultaneous jobs
```

### Database Security

1. **Use SSL/TLS for database connections:**
   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
   ```

2. **Use strong passwords** - minimum 16 characters with mixed case, numbers, and symbols

3. **Enable row-level security (RLS)** in PostgreSQL for multi-tenant isolation

4. **Regular backups** - Schedule automated backups with encryption

### API Security Headers

The following security headers are automatically applied:

- `Strict-Transport-Security` - Force HTTPS
- `X-Content-Type-Options` - Prevent MIME sniffing
- `X-Frame-Options` - Prevent clickjacking
- `X-XSS-Protection` - Enable XSS filtering
- `Referrer-Policy` - Control referrer information

### Docker Security

When deploying with Docker:

1. **Run as non-root user** (already configured in Dockerfile)
2. **Scan images for vulnerabilities:**
   ```bash
   docker scan ai-lead-gen-pro:latest
   ```
3. **Use secrets management:**
   ```bash
   docker secret create db_password ./db_password.txt
   ```

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via:
- Email: security@yourdomain.com
- For sensitive issues, use our PGP key: [link-to-pgp-key]

Include:
1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

### Response Timeline

- **Initial response:** Within 48 hours
- **Status update:** Within 7 days
- **Fix timeline:** Depends on severity
  - Critical: 1-7 days
  - High: 7-14 days
  - Medium: 14-30 days
  - Low: 30-90 days

## Security Checklist for Production

- [ ] Change all default passwords and API keys
- [ ] Set `ALLOW_ANONYMOUS=false`
- [ ] Configure `ALLOWED_ORIGINS` with specific domains
- [ ] Enable HTTPS/TLS for all connections
- [ ] Set up database SSL/TLS
- [ ] Configure rate limiting
- [ ] Enable audit logging
- [ ] Set up monitoring and alerting
- [ ] Regular security updates
- [ ] Implement backup strategy
- [ ] Configure secrets management
- [ ] Review and restrict database permissions
- [ ] Enable row-level security (RLS)
- [ ] Set up Web Application Firewall (WAF)
- [ ] Configure DDoS protection

## Compliance

This application handles company data and job posting information. Ensure compliance with:

- **GDPR** (if serving EU users)
- **CCPA** (if serving California residents)
- **SOC 2** (for enterprise deployments)
- **Data retention policies**
- **Right to deletion**

## Security Updates

Subscribe to security advisories:
- Watch this repository for security alerts
- Enable Dependabot security updates
- Join our security mailing list

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/advanced-features/security-headers)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
