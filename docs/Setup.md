# 🚀 AI Hive Mind Setup Guide

## Prerequisites

### System Requirements
- **Node.js**: 18.0 or higher
- **npm**: 8.0 or higher (comes with Node.js)
- **Git**: Latest version
- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+

### Optional Dependencies (for full functionality)
- **PostgreSQL**: 13+ (for persistent memory)
- **Redis**: 6+ (for caching and sessions)
- **Ollama**: For local AI models

## Quick Start (5 minutes)

### 1. Clone and Install
```bash
git clone https://github.com/jfbinTECHA/Hive-Mind.git
cd Hive-Mind
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Basic Configuration
NEXTAUTH_SECRET=your-random-secret-here
NEXTAUTH_URL=http://localhost:3000

# Optional: Database (for persistent memory)
DATABASE_URL=postgresql://localhost:5432/ai_hive_mind
REDIS_URL=redis://localhost:6379

# Optional: Voice APIs
OPENAI_API_KEY=sk-your-openai-key  # For Whisper (speech-to-text)
ELEVENLABS_API_KEY=your-elevenlabs-key  # For ElevenLabs (text-to-speech)

# Optional: Local AI
OLLAMA_URL=http://localhost:11434
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Setup

### Local Development Environment

#### 1. Node.js Installation
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 8.x.x
```

#### 2. Git Configuration
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Database Setup (Optional but Recommended)

#### PostgreSQL Installation

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb ai_hive_mind
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
createdb ai_hive_mind
```

**Windows:**
Download from [postgresql.org](https://www.postgresql.org/download/windows/)

#### Redis Installation

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**macOS:**
```bash
brew install redis
brew services start redis
```

### Local AI Setup (Optional)

#### Ollama Installation
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# In another terminal, pull models
ollama pull llama3:8b        # General purpose
ollama pull mistral:7b       # Fast and capable
ollama pull nomic-embed-text # For memory embeddings
```

## Project Structure

```
Hive-Mind/
├── docs/                    # Documentation
├── public/                  # Static assets
├── scripts/                 # Setup and utility scripts
├── src/
│   ├── app/                # Next.js app router
│   │   ├── api/           # API endpoints
│   │   ├── globals.css    # Global styles
│   │   └── layout.tsx     # Root layout
│   ├── components/        # React components
│   │   ├── ui/           # Reusable UI components
│   │   └── *             # Feature components
│   ├── lib/              # Business logic
│   │   ├── ai/          # AI processing
│   │   ├── memory/      # Memory management
│   │   ├── voice/       # Voice processing
│   │   └── safety/      # Safety & moderation
│   ├── context/         # React context providers
│   ├── types/           # TypeScript definitions
│   └── hooks/           # Custom React hooks
├── .env.local            # Environment variables
├── package.json          # Dependencies and scripts
├── tailwind.config.js    # Tailwind CSS configuration
└── next.config.ts        # Next.js configuration
```

## Configuration Options

### Environment Variables

#### Required
```env
NEXTAUTH_SECRET=your-random-secret-string
NEXTAUTH_URL=http://localhost:3000
```

#### Database (Recommended)
```env
DATABASE_URL=postgresql://username:password@localhost:5432/ai_hive_mind
REDIS_URL=redis://localhost:6379
```

#### Voice APIs (Optional)
```env
OPENAI_API_KEY=sk-your-openai-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
```

#### Local AI (Optional)
```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3:8b
```

### AI Companion Configuration

#### Personality Profiles
Located in `src/lib/personalities.ts`:

```typescript
export const personalities = {
  friendly: {
    name: 'Friendly',
    traits: ['warm', 'approachable', 'empathetic'],
    communicationStyle: 'casual',
    emotionalRange: 0.8,
    creativity: 0.7,
    empathy: 0.9
  },
  // Add custom personalities here
};
```

#### Memory Settings
Configure in `src/lib/memory/config.ts`:

```typescript
export const memoryConfig = {
  maxMemories: 1000,
  embeddingModel: 'nomic-embed-text',
  similarityThreshold: 0.7,
  memoryRetentionDays: 365
};
```

## Development Workflow

### Running the Application

#### Development Mode
```bash
npm run dev
```
- Hot reloading enabled
- Development tools available
- Console logging enabled

#### Production Build
```bash
npm run build
npm run start
```
- Optimized production build
- Static file optimization
- Error boundaries enabled

### Testing

#### Unit Tests
```bash
npm run test
```

#### E2E Tests
```bash
npm run test:e2e
```

### Code Quality

#### Linting
```bash
npm run lint
```

#### Type Checking
```bash
npm run type-check
```

#### Formatting
```bash
npm run format
```

## Deployment Options

### Vercel (Recommended)

#### 1. Install Vercel CLI
```bash
npm i -g vercel
```

#### 2. Deploy
```bash
vercel
```

#### 3. Configure Environment Variables
```bash
vercel env add NEXTAUTH_SECRET
vercel env add DATABASE_URL
# Add other required variables
```

### Docker Deployment

#### Build and Run
```bash
docker build -t ai-hive-mind .
docker run -p 3000:3000 ai-hive-mind
```

#### Docker Compose (with database)
```bash
docker-compose up -d
```

### Manual Server Deployment

#### 1. Build for Production
```bash
npm run build
```

#### 2. Start Production Server
```bash
npm run start
```

#### 3. Configure Reverse Proxy (nginx example)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## API Configuration

### External API Keys

#### OpenAI (Whisper)
1. Visit [OpenAI API](https://platform.openai.com/api-keys)
2. Create new API key
3. Add to environment: `OPENAI_API_KEY=sk-...`

#### ElevenLabs (Voice)
1. Visit [ElevenLabs](https://elevenlabs.io/app/profile)
2. Get API key from profile settings
3. Add to environment: `ELEVENLABS_API_KEY=...`

### Local AI Models

#### Ollama Configuration
```bash
# List available models
ollama list

# Pull specific model
ollama pull llama3:8b

# Set as default in .env.local
OLLAMA_MODEL=llama3:8b
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
npm run dev -- -p 3001
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart if needed
sudo systemctl restart postgresql

# Test connection
psql -d ai_hive_mind -c "SELECT 1;"
```

#### Memory Issues
```bash
# Clear Next.js cache
rm -rf .next

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Voice API Issues
```bash
# Test OpenAI API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Test ElevenLabs API key
curl -H "xi-api-key: $ELEVENLABS_API_KEY" \
     https://api.elevenlabs.io/v1/voices
```

### Performance Optimization

#### Bundle Analysis
```bash
npm install --save-dev @next/bundle-analyzer
npm run build:analyze
```

#### Memory Monitoring
```bash
# Monitor Node.js memory usage
node --expose-gc --max-old-space-size=4096
```

### Logs and Debugging

#### Development Logs
```bash
# Enable verbose logging
DEBUG=* npm run dev
```

#### Production Logs
```bash
# View application logs
pm2 logs ai-hive-mind

# Or with Docker
docker logs ai-hive-mind
```

## Contributing

### Development Guidelines

1. **Code Style**: Follow ESLint and Prettier configurations
2. **Commits**: Use conventional commit format
3. **Testing**: Add tests for new features
4. **Documentation**: Update docs for API changes

### Branch Strategy
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

## Support

### Getting Help

- **Documentation**: Check `/docs` directory
- **Issues**: [GitHub Issues](https://github.com/jfbinTECHA/Hive-Mind/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jfbinTECHA/Hive-Mind/discussions)

### Community
- **Discord**: Join our community server
- **Twitter**: Follow for updates
- **Newsletter**: Subscribe for release notes

This setup guide provides everything needed to get the AI Hive Mind running locally or deploy it to production. The system is designed to be flexible and scalable, supporting everything from simple development setups to complex production deployments.