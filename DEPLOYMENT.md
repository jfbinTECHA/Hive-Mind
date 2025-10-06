# 🚀 AI Hive Mind - Deployment Guide

This guide covers multiple deployment options for the AI Hive Mind application, from simple hosting to full production setups.

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL with pgvector extension
- Redis
- Ollama (for local LLM inference)

## 🎯 Quick Deployment Options

### Option 1: Vercel + Neon.tech + Redis Cloud (Recommended for Prototyping)

**Best for:** Quick deployment, prototyping, and development

#### 1. Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

#### 2. Database (Neon.tech)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Enable pgvector extension:
   ```sql
   CREATE EXTENSION vector;
   ```
4. Copy connection string

#### 3. Redis (Redis Cloud)

1. Sign up at [redis.com](https://redis.com)
2. Create a Redis Cloud database
3. Copy connection URL

#### 4. Environment Variables

```bash
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
REDIS_URL="redis://user:pass@host:port"
OLLAMA_BASE_URL="http://your-ollama-server:11434"
VECTOR_DB_TYPE="pgvector"
```

---

### Option 2: Railway (Full-Stack)

**Best for:** Complete application with managed services

#### Deploy with Railway

```bash
# Run deployment script
./scripts/deploy-railway.sh

# Or manual deployment:
railway login
railway init ai-hive-mind
railway up
```

#### Railway Services Setup

1. **PostgreSQL**: Automatically provided by Railway
2. **Redis**: Add Redis service to your Railway project
3. **Ollama**: Deploy Ollama as a separate service

---

### Option 3: Docker Compose (Local/On-Premise)

**Best for:** Local development and on-premise deployment

#### Quick Start

```bash
# Clone and setup
git clone <repository>
cd ai-hive-mind

# Copy environment file
cp .env.example .env.local

# Start all services
docker-compose up -d

# Initialize database
docker-compose exec postgres psql -U postgres -d ai_hive_mind -f /docker-entrypoint-initdb.d/init-db.sql
```

#### Services Included

- **AI Hive Mind**: Main application (Port 3000)
- **PostgreSQL + pgvector**: Database with vector search
- **Redis**: Caching and session storage
- **Ollama**: Local LLM inference (Port 11434)
- **Chroma**: Alternative vector database (Port 8000)
- **Nginx**: Reverse proxy (Ports 80/443)

---

### Option 4: Ubuntu Docker Stack (Production)

**Best for:** Production deployment on Ubuntu servers

#### Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com | sh
sudo apt install docker-compose-plugin

# Clone repository
git clone <repository>
cd ai-hive-mind

# Configure environment
cp .env.example .env.production
nano .env.production  # Edit with production values

# Deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

#### Production Docker Compose Override

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  ai-hive-mind:
    environment:
      - NODE_ENV=production
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

---

## 🗄️ Database Setup

### Neon.tech (Managed PostgreSQL)

1. **Create Project**

   ```bash
   # Visit https://neon.tech and create account
   # Create new project
   ```

2. **Enable Extensions**

   ```sql
   -- Run in Neon SQL Editor
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgvector";
   CREATE EXTENSION IF NOT EXISTS "pg_trgm";
   ```

3. **Initialize Schema**
   ```bash
   # Connect to your database
   psql "your-neon-connection-string" -f scripts/init-db.sql
   ```

### Local PostgreSQL

```bash
# Install PostgreSQL and pgvector
sudo apt install postgresql postgresql-contrib
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make && sudo make install

# Create database
sudo -u postgres createdb ai_hive_mind
sudo -u postgres psql -d ai_hive_mind -f scripts/init-db.sql
```

---

## 🧠 LLM Setup

### Ollama (Local Inference)

```bash
# Run setup script
./scripts/setup-ollama.sh

# Or manual setup:
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models
ollama pull llama2:7b-chat
ollama pull nomic-embed-text

# Start service
ollama serve
```

### Cloud LLM Alternatives

#### Together AI

```bash
export TOGETHER_API_KEY="your-api-key"
# Set OLLAMA_BASE_URL="" to disable local Ollama
```

#### OpenAI

```bash
export OPENAI_API_KEY="your-api-key"
# Application will automatically use OpenAI if available
```

---

## 🔍 Vector Database Setup

### pgvector (Recommended)

```sql
-- Already included in init-db.sql
-- Creates vector columns with 768 dimensions (for nomic-embed-text)
CREATE INDEX ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Chroma (Alternative)

```bash
# Start Chroma service
docker run -p 8000:8000 chromadb/chroma:latest

# Configure environment
export VECTOR_DB_TYPE="chroma"
export CHROMA_URL="http://localhost:8000"
```

---

## 🔧 Environment Configuration

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
DIRECT_URL="postgresql://user:pass@host/db?sslmode=require"

# Redis
REDIS_URL="redis://user:pass@host:port"

# LLM
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama2:7b-chat"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text"

# Vector DB
VECTOR_DB_TYPE="pgvector"  # or "chroma"
VECTOR_DB_URL="postgresql://user:pass@host/db?sslmode=require"

# Authentication
NEXTAUTH_SECRET="your-secret-here"
JWT_SECRET="your-jwt-secret"

# External APIs
ELEVENLABS_API_KEY="your-key"
STABILITY_API_KEY="your-key"
KAIBER_API_KEY="your-key"
```

### Optional Variables

```bash
# Feature Flags
ENABLE_VOICE_GENERATION=true
ENABLE_AVATAR_ANIMATIONS=true
ENABLE_GROUP_CHAT=true
ENABLE_EMOTIONAL_TRACKING=true

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=10
RATE_LIMIT_REQUESTS_PER_HOUR=50

# Monitoring
SENTRY_DSN="your-sentry-dsn"
LOG_LEVEL="info"
```

---

## 🚀 Deployment Commands

### Vercel Deployment

```bash
# Install CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables
vercel env add DATABASE_URL
vercel env add REDIS_URL
# ... add other variables
```

### Railway Deployment

```bash
# Run automated script
./scripts/deploy-railway.sh

# Or manual:
railway login
railway init ai-hive-mind
railway up
```

### Docker Deployment

```bash
# Development
docker-compose up

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale services
docker-compose up -d --scale ai-hive-mind=3
```

---

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Application health
curl http://localhost:3000/api/health

# Database connectivity
docker-compose exec postgres pg_isready -U postgres

# Redis connectivity
docker-compose exec redis redis-cli ping

# Ollama status
curl http://localhost:11434/api/tags
```

### Backup Strategy

```bash
# Database backup
docker-compose exec postgres pg_dump -U postgres ai_hive_mind > backup.sql

# Automated backups (add to crontab)
0 2 * * * docker-compose exec postgres pg_dump -U postgres ai_hive_mind > /backups/backup_$(date +\%Y\%m\%d).sql
```

### Log Management

```bash
# View application logs
docker-compose logs -f ai-hive-mind

# View all service logs
docker-compose logs -f

# Log rotation
docker-compose exec ai-hive-mind logrotate /etc/logrotate.d/ai-hive-mind
```

---

## 🔒 Security Considerations

### API Keys

- Store API keys in environment variables
- Use secret management services (Railway, Vercel, etc.)
- Rotate keys regularly

### Database Security

- Use SSL connections (`sslmode=require`)
- Implement row-level security (RLS)
- Regular security updates

### Network Security

- Use HTTPS in production
- Implement rate limiting
- Configure CORS properly
- Use VPN for database access

---

## 📈 Scaling Considerations

### Horizontal Scaling

```bash
# Scale application instances
docker-compose up -d --scale ai-hive-mind=5

# Load balancer configuration
nginx.conf:
upstream ai_hive_mind {
    server ai-hive-mind:3000;
    server ai-hive-mind:3001;
    server ai-hive-mind:3002;
}
```

### Database Scaling

- Use connection pooling (pgbouncer)
- Implement read replicas
- Consider database sharding for large datasets

### Caching Strategy

- Redis for session storage
- CDN for static assets
- Application-level caching for API responses

---

## 🐛 Troubleshooting

### Common Issues

**Ollama Connection Failed**

```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Restart Ollama
sudo systemctl restart ollama
```

**Database Connection Issues**

```bash
# Test connection
psql "your-connection-string"

# Check Docker logs
docker-compose logs postgres
```

**Build Failures**

```bash
# Clear build cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

---

## 📚 Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Railway Documentation](https://docs.railway.app/)
- [Neon.tech Documentation](https://neon.tech/docs/)
- [Ollama Documentation](https://github.com/jmorganca/ollama)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Chroma Documentation](https://docs.trychroma.com/)

---

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] Database schema initialized
- [ ] SSL certificates installed
- [ ] Domain configured
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Error tracking configured
- [ ] Performance monitoring active

For additional support or custom deployment configurations, please refer to the project documentation or create an issue in the repository.
