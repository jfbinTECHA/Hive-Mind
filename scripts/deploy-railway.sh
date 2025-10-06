#!/bin/bash

# AI Hive Mind - Railway Deployment Script
# This script helps deploy the AI Hive Mind to Railway

set -e

echo "🚂 AI Hive Mind - Railway Deployment"
echo "===================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "❌ You are not logged in to Railway. Please run:"
    echo "railway login"
    exit 1
fi

echo "✅ Railway CLI is ready"

# Create new Railway project
echo "📦 Creating Railway project..."
PROJECT_NAME="ai-hive-mind-$(date +%s)"
railway init "$PROJECT_NAME" --source=.

# Set up environment variables
echo "🔧 Setting up environment variables..."

# Database (Railway will provide Postgres automatically)
railway variables set NODE_ENV=production
railway variables set NEXTAUTH_URL=\$RAILWAY_STATIC_URL
railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Redis (Railway provides Redis)
railway variables set REDIS_URL=\$REDIS_URL

# Ollama (local deployment)
railway variables set OLLAMA_BASE_URL=http://ollama:11434
railway variables set OLLAMA_MODEL=llama2:7b-chat

# Vector DB (using pgvector)
railway variables set VECTOR_DB_TYPE=pgvector
railway variables set VECTOR_DB_URL=\$DATABASE_URL

# API Keys (user needs to set these)
echo "⚠️  Please set the following API keys in Railway dashboard:"
echo "   - ELEVENLABS_API_KEY"
echo "   - OPENAI_API_KEY (optional)"
echo "   - TOGETHER_API_KEY (optional)"

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "1. Set API keys in Railway dashboard"
echo "2. Add Ollama service to Railway project"
echo "3. Configure domain if needed"
echo "4. Monitor deployment logs"
echo ""
echo "🔗 Your app will be available at: https://$PROJECT_NAME.up.railway.app"