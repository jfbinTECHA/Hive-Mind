# AI Hive Mind

A comprehensive AI companion chat application with multi-character support, persistent memory, and advanced features.

## Features

- **Multi-Character AI Companions**: Create and interact with multiple AI personalities
- **Persistent Memory**: PostgreSQL-backed memory system with vector embeddings
- **Real-time Chat**: WebSocket support for live conversations
- **Voice Integration**: Text-to-speech and speech-to-text capabilities
- **Safety Layer**: Content filtering, rate limiting, and moderation
- **Group Chat**: Multiple AIs can converse together
- **Emotional Intelligence**: Avatars respond to conversation emotions

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with vector extensions
- **Cache**: Redis
- **Voice**: Web Speech API

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Ollama (for local AI models)
- npm or yarn

### Ollama Setup (Local AI Models)

1. **Install Ollama**:
   ```bash
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh

   # macOS
   brew install ollama

   # Windows
   # Download from https://ollama.ai/download
   ```

2. **Start Ollama server**:
   ```bash
   ollama serve
   ```

3. **Pull recommended models**:
   ```bash
   ollama pull llama3:8b        # General purpose, good balance
   ollama pull mistral:7b       # Fast and capable
   ollama pull nomic-embed-text # For memory embeddings
   ```

### Database Setup

1. **Install PostgreSQL and Redis**:
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib redis-server

   # macOS with Homebrew
   brew install postgresql redis

   # Start services
   sudo systemctl start postgresql redis  # Linux
   brew services start postgresql redis   # macOS
   ```

2. **Create Database**:
   ```sql
   createdb ai_hive_mind
   ```

3. **Enable Vector Extension** (for memory embeddings):
   ```sql
   psql ai_hive_mind -c "CREATE EXTENSION IF NOT EXISTS vector;"
   ```

4. **Environment Variables**:
   Create `.env.local`:
   ```env
   DATABASE_URL=postgresql://localhost:5432/ai_hive_mind
   REDIS_URL=redis://localhost:6379
   OLLAMA_URL=http://localhost:11434
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   ```

5. **Initialize Database**:
   ```bash
   npm run db:init
   ```

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## API Endpoints

### Chat
- `POST /api/chat` - Send message and get AI response
- `WS /api/live` - Real-time streaming responses

### Characters
- `GET /api/characters` - List all AI companions
- `POST /api/character` - Create new AI companion

### Memory
- `GET /api/memory/[ai_id]` - Get memories for specific AI
- `POST /api/memory` - Add/update/delete memories

### Ollama (Local AI)
- `GET /api/ollama/status` - Check Ollama connection status
- `GET /api/ollama/models` - List available and installed models
- `POST /api/ollama/pull` - Pull/download a model
- `POST /api/ollama/active` - Set active model

## Database Schema

### Users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  auth_provider VARCHAR(50),
  auth_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Characters
```sql
CREATE TABLE characters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  system_prompt TEXT,
  avatar_url VARCHAR(500),
  traits TEXT[],
  personality VARCHAR(50) DEFAULT 'friendly',
  voice VARCHAR(100) DEFAULT 'default',
  familiarity INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Memory
```sql
CREATE TABLE memory (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  ai_id INTEGER REFERENCES characters(id),
  fact_text TEXT NOT NULL,
  vector_embedding VECTOR(1536), -- Vector embeddings for semantic search
  fact_type VARCHAR(50) DEFAULT 'general',
  confidence FLOAT DEFAULT 1.0,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Memory Embedding System
The application uses advanced vector embeddings for intelligent memory retrieval:

- **Automatic Fact Extraction**: Analyzes conversations to extract personal info, preferences, experiences, and relationships
- **Vector Embeddings**: Uses Ollama's `nomic-embed-text` model for semantic similarity search
- **Similarity Search**: Retrieves top-5 most relevant memories before each chat using cosine similarity
- **Context Injection**: Relevant memories are automatically injected into AI prompts for personalized responses
- **Cross-AI Memory**: Memories can be shared across different AI companions for consistent experiences

**Memory Types**:
- `personal`: Names, locations, demographics, occupations
- `preference`: Likes, dislikes, interests, hobbies
- `experience`: Events, activities, achievements, travel
- `relationship`: Family, friends, social connections
- `knowledge`: Factual information learned from conversations

**RAG Process**:
1. User sends message
2. Generate embedding for the message
3. Query vector database for similar memories (top-5)
4. Inject relevant memories into AI context
5. AI generates response with personalized knowledge
6. Extract new facts from conversation and store as vectors

### Messages
```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  ai_id INTEGER REFERENCES characters(id),
  user_message TEXT,
  ai_response TEXT,
  conversation_id VARCHAR(255),
  emotion VARCHAR(50) DEFAULT 'neutral',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Development

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:init` - Initialize database and create default data

### Project Structure
```
src/
├── app/
│   ├── api/           # API routes
│   ├── globals.css    # Global styles
│   └── layout.tsx     # Root layout
├── components/        # React components
├── context/          # React context
├── lib/              # Utilities and database
└── types/            # TypeScript types
```

## Features in Detail

### AI Companions
- **Multiple Personalities**: Friendly, Professional, Humorous, Serious
- **Dynamic Avatars**: Change based on personality and emotion
- **Memory Persistence**: Each AI remembers conversations and facts
- **Group Dynamics**: Multiple AIs can chat together

### Safety & Moderation
- **Content Filtering**: Blocks inappropriate content
- **Rate Limiting**: Prevents spam and abuse
- **Usage Tracking**: Monitors conversation patterns
- **Authentication**: User session management

### Voice & Media
- **Text-to-Speech**: AI responses can be spoken
- **Speech Recognition**: Voice input support
- **Emotional Feedback**: Visual and audio cues
- **Accessibility**: Screen reader support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
