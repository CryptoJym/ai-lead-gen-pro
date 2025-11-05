# Docker Deployment Guide

This guide covers running AI Lead Gen Pro with Docker and Docker Compose.

## Quick Start

### Using Docker Compose (Recommended)

The easiest way to get started is with Docker Compose, which sets up all services:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

This will start:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **AI Lead Gen Pro** on port 3000

Access the application at http://localhost:3000

### With Management Tools

Start with Adminer (database UI) and Redis Commander:

```bash
docker-compose --profile tools up -d
```

Access:
- **Application**: http://localhost:3000
- **Adminer** (Database UI): http://localhost:8080
- **Redis Commander**: http://localhost:8081

## Building the Docker Image

### Production Build

```bash
# Build production image
docker build -t ai-lead-gen-pro:latest .

# Run the container
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e REDIS_URL=redis://host:6379 \
  --name ai-leadgen \
  ai-lead-gen-pro:latest
```

### Development Build

For development with hot reload:

```bash
# Use docker-compose with mounted volumes
docker-compose -f docker-compose.dev.yml up
```

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/ai_lead_gen_pro

# Redis
REDIS_URL=redis://redis:6379

# Application
NODE_ENV=production
DEFAULT_CLIENT_ID=your-client-id
API_KEY=your-secure-api-key
JWT_SECRET=your-jwt-secret

# Security
ALLOWED_ORIGINS=https://yourdomain.com
ALLOW_ANONYMOUS=false
```

### Optional Environment Variables

```bash
# Rate Limiting
DAILY_RESEARCH_CAP_PER_TENANT=50
MAX_CONCURRENT_RESEARCH_JOBS=3

# Features
ENABLE_CACHE=true
ENABLE_LLM_SYNTHESIS=false
USE_REAL_SCRAPING=false

# External APIs
NEWS_API_KEY=your-newsapi-key
SERP_API_KEY=your-serpapi-key
BUILTWITH_API_KEY=your-builtwith-key
```

## Docker Compose Configuration

### Basic Configuration (docker-compose.yml)

Already configured for local development with:
- PostgreSQL 15
- Redis 7
- AI Lead Gen Pro app

### Production Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    image: ai-lead-gen-pro:latest
    restart: always
    depends_on:
      - postgres
      - redis
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://leadgen:${DB_PASSWORD}@postgres:5432/ai_lead_gen_pro
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
      API_KEY: ${API_KEY}
      JWT_SECRET: ${JWT_SECRET}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
      ALLOW_ANONYMOUS: false
    networks:
      - leadgen-network

  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: leadgen
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ai_lead_gen_pro
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - leadgen-network

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - leadgen-network

volumes:
  postgres_data:
  redis_data:

networks:
  leadgen-network:
    driver: bridge
```

Use with:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Database Management

### Run Migrations

```bash
# Access the app container
docker-compose exec app sh

# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### Backup Database

```bash
# Backup
docker-compose exec postgres pg_dump -U leadgen ai_lead_gen_pro > backup.sql

# Restore
docker-compose exec -T postgres psql -U leadgen ai_lead_gen_pro < backup.sql
```

### Access PostgreSQL CLI

```bash
docker-compose exec postgres psql -U leadgen -d ai_lead_gen_pro
```

## Redis Management

### Access Redis CLI

```bash
docker-compose exec redis redis-cli
```

### Clear Cache

```bash
docker-compose exec redis redis-cli FLUSHALL
```

## Logs and Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f redis

# Last 100 lines
docker-compose logs --tail=100 app
```

### Health Checks

```bash
# Check all services
docker-compose ps

# Check app health
curl http://localhost:3000/api/status
```

## Scaling

### Horizontal Scaling

Run multiple app instances behind a load balancer:

```yaml
services:
  app:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

### Vertical Scaling

Adjust resource limits:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Production Deployment

### Using Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml leadgen

# Scale services
docker service scale leadgen_app=3

# View services
docker service ls
```

### Using Kubernetes

See [KUBERNETES.md](./KUBERNETES.md) for Kubernetes deployment guide.

## Troubleshooting

### App won't start

```bash
# Check logs
docker-compose logs app

# Verify environment variables
docker-compose exec app env | grep DATABASE_URL

# Check database connection
docker-compose exec app node -e "console.log(process.env.DATABASE_URL)"
```

### Database connection issues

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready -U leadgen
```

### Redis connection issues

```bash
# Verify Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping
```

### Performance issues

```bash
# Check resource usage
docker stats

# Increase memory limits
# Edit docker-compose.yml and add:
services:
  app:
    mem_limit: 2g
    cpus: 2
```

## Security

### Best Practices

1. **Use secrets for sensitive data:**
   ```bash
   docker secret create db_password ./db_password.txt
   docker secret create api_key ./api_key.txt
   ```

2. **Run as non-root user** (already configured)

3. **Limit network exposure:**
   ```yaml
   services:
     postgres:
       networks:
         - backend  # Don't expose to external network
   ```

4. **Use specific image versions:**
   ```yaml
   services:
     postgres:
       image: postgres:15.4-alpine  # Not :latest
   ```

5. **Scan images regularly:**
   ```bash
   docker scan ai-lead-gen-pro:latest
   ```

## Maintenance

### Update Application

```bash
# Pull latest code
git pull

# Rebuild image
docker-compose build app

# Restart with new image
docker-compose up -d app
```

### Cleanup

```bash
# Remove stopped containers
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Remove all unused images
docker image prune -a
```

## Advanced Configuration

### Custom Network

```yaml
networks:
  leadgen-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

### Persistent Logs

```yaml
services:
  app:
    volumes:
      - ./logs:/app/logs
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Health Checks

```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/status"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/CryptoJym/ai-lead-gen-pro/issues
- Documentation: See README.md
- Security: See SECURITY.md
