#!/bin/bash

# AI Hive Mind - Ollama Setup Script
# This script helps set up Ollama for local LLM inference

set -e

echo "🧠 AI Hive Mind - Ollama Setup"
echo "=============================="

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed. Installing..."

    # Install Ollama based on OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux installation
        curl -fsSL https://ollama.ai/install.sh | sh
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS installation
        brew install ollama
    else
        echo "❌ Unsupported OS. Please install Ollama manually from: https://ollama.ai"
        exit 1
    fi
fi

echo "✅ Ollama is installed"

# Start Ollama service
echo "🚀 Starting Ollama service..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo systemctl start ollama 2>/dev/null || ollama serve &
elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start ollama 2>/dev/null || ollama serve &
fi

# Wait for Ollama to start
echo "⏳ Waiting for Ollama to start..."
sleep 5

# Pull required models
echo "📥 Pulling required models..."

# Main chat model
echo "Pulling llama2:7b-chat..."
ollama pull llama2:7b-chat

# Embedding model for vector search
echo "Pulling nomic-embed-text..."
ollama pull nomic-embed-text

# Optional: Additional models for different personalities
echo "Pulling smaller models for variety..."
ollama pull orca-mini 2>/dev/null || echo "orca-mini not available, skipping"
ollama pull phi 2>/dev/null || echo "phi not available, skipping"

# Verify installation
echo "🔍 Verifying installation..."
echo "Available models:"
ollama list

echo "🧪 Testing Ollama API..."
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "✅ Ollama API is responding"
else
    echo "❌ Ollama API is not responding. Please check the service."
    exit 1
fi

# Create systemd service for production (Linux only)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "📝 Creating systemd service..."

    sudo tee /etc/systemd/system/ollama.service > /dev/null <<EOF
[Unit]
Description=Ollama AI Service
After=network.target

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=/home/$USER
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable ollama
    echo "✅ Systemd service created. Use 'sudo systemctl start ollama' to start."
fi

echo ""
echo "🎉 Ollama setup complete!"
echo ""
echo "📋 Configuration:"
echo "   - Main Model: llama2:7b-chat"
echo "   - Embedding Model: nomic-embed-text"
echo "   - API Endpoint: http://localhost:11434"
echo ""
echo "🔧 Environment Variables for your app:"
echo "   OLLAMA_BASE_URL=http://localhost:11434"
echo "   OLLAMA_MODEL=llama2:7b-chat"
echo "   OLLAMA_EMBEDDING_MODEL=nomic-embed-text"
echo ""
echo "📚 Useful commands:"
echo "   ollama list          # List installed models"
echo "   ollama pull <model>  # Download a model"
echo "   ollama rm <model>    # Remove a model"
echo "   ollama serve         # Start Ollama server"