# 🔌 AI Hive Mind API Reference

## Overview

The AI Hive Mind provides a comprehensive REST API for managing AI companions, conversations, memory, and system operations. All endpoints return JSON responses and use standard HTTP status codes.

## Base URL
```
https://your-domain.com/api
```

## Authentication

### Session-based Authentication
Most endpoints require user authentication. Include session cookies or use NextAuth.js session tokens.

### API Key Authentication (for external integrations)
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://your-domain.com/api/endpoint
```

## Endpoints

### 🤖 Chat & Conversation

#### POST `/api/chat`
Send a message to an AI companion and receive a response.

**Request:**
```typescript
interface ChatRequest {
  message: string;
  companionId: string;
  context?: {
    conversationId?: string;
    previousMessages?: number;
    includeMemory?: boolean;
  };
  options?: {
    voice?: boolean;
    stream?: boolean;
    temperature?: number;
  };
}
```

**Response:**
```typescript
interface ChatResponse {
  success: boolean;
  response: {
    text: string;
    companionId: string;
    conversationId: string;
    timestamp: string;
    metadata: {
      processingTime: number;
      memoryUsed: number;
      tokensUsed: number;
    };
  };
  voice?: {
    audioUrl: string;
    duration: number;
  };
}
```

**Example:**
```bash
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how are you?",
    "companionId": "ai-hive-mind",
    "context": {
      "includeMemory": true,
      "previousMessages": 5
    },
    "options": {
      "voice": true,
      "temperature": 0.7
    }
  }'
```

#### GET `/api/chat/history`
Retrieve conversation history for a user.

**Query Parameters:**
- `companionId` (optional): Filter by specific companion
- `limit` (optional): Number of conversations (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Examples:**

```bash
# Get recent conversations
curl "https://your-domain.com/api/chat/history?limit=10"

# Get conversations with specific companion
curl "https://your-domain.com/api/chat/history?companionId=friendly-companion&limit=5"

# Get conversations from date range
curl "https://your-domain.com/api/chat/history?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z"
```

```javascript
// JavaScript/Node.js example
const response = await fetch('/api/chat/history?companionId=ai-hive-mind&limit=20');
const data = await response.json();

console.log(`Found ${data.conversations.length} conversations`);
data.conversations.forEach(conv => {
  console.log(`Conversation ${conv.id}: ${conv.messages.length} messages`);
});
```

**Response:**
```typescript
interface ChatHistoryResponse {
  success: boolean;
  conversations: Array<{
    id: string;
    companionId: string;
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
      metadata?: any;
    }>;
    startedAt: string;
    lastActivity: string;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
```

**Sample Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv_12345",
      "companionId": "friendly-companion",
      "messages": [
        {
          "role": "user",
          "content": "Hello! How are you today?",
          "timestamp": "2024-01-15T10:30:00Z"
        },
        {
          "role": "assistant",
          "content": "Hi there! I'm doing great, thank you for asking! It's wonderful to hear from you. How has your day been so far?",
          "timestamp": "2024-01-15T10:30:02Z",
          "metadata": {
            "processingTime": 450,
            "memoryUsed": 3,
            "tokensUsed": 28
          }
        }
      ],
      "startedAt": "2024-01-15T10:30:00Z",
      "lastActivity": "2024-01-15T10:30:02Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

### 👥 AI Companions

#### GET `/api/companions`
List all available AI companions.

**Examples:**

```bash
# Get all companions
curl https://your-domain.com/api/companions
```

```javascript
// JavaScript example
const response = await fetch('/api/companions');
const data = await response.json();

data.companions.forEach(companion => {
  console.log(`${companion.name}: ${companion.personality} (${companion.familiarity}% familiar)`);
});
```

**Response:**
```typescript
interface CompanionsResponse {
  success: boolean;
  companions: Array<{
    id: string;
    name: string;
    personality: string;
    avatar: string;
    traits: string[];
    familiarity: number;
    isActive: boolean;
    createdAt: string;
    lastInteraction: string;
  }>;
}
```

**Sample Response:**
```json
{
  "success": true,
  "companions": [
    {
      "id": "comp_123",
      "name": "Alex",
      "personality": "friendly",
      "avatar": "🤖",
      "traits": ["warm", "empathetic", "encouraging"],
      "familiarity": 85.5,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastInteraction": "2024-01-15T14:30:00Z"
    },
    {
      "id": "comp_456",
      "name": "Jordan",
      "personality": "professional",
      "avatar": "👔",
      "traits": ["analytical", "organized", "reliable"],
      "familiarity": 72.3,
      "isActive": true,
      "createdAt": "2024-01-05T00:00:00Z",
      "lastInteraction": "2024-01-15T09:15:00Z"
    }
  ]
}
```

#### POST `/api/companions`
Create a new AI companion.

**Examples:**

```bash
# Create a friendly companion
curl -X POST https://your-domain.com/api/companions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sam",
    "personality": "friendly",
    "traits": ["warm", "empathetic", "creative"],
    "avatar": "😊"
  }'

# Create a professional companion with voice settings
curl -X POST https://your-domain.com/api/companions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Morgan",
    "personality": "professional",
    "traits": ["analytical", "organized", "knowledgeable"],
    "avatar": "👔",
    "voiceSettings": {
      "voiceId": "ErXwobaYiN019PkySvjV",
      "stability": 0.8,
      "similarity": 0.9
    }
  }'
```

```javascript
// JavaScript example
const newCompanion = {
  name: "Luna",
  personality: "humorous",
  traits: ["witty", "playful", "creative"],
  avatar: "🌙"
};

const response = await fetch('/api/companions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newCompanion)
});

const data = await response.json();
console.log(`Created companion: ${data.companion.name} (ID: ${data.companion.id})`);
```

**Request:**
```typescript
interface CreateCompanionRequest {
  name: string;
  personality: 'friendly' | 'professional' | 'humorous' | 'serious';
  traits?: string[];
  avatar?: string;
  voiceSettings?: {
    voiceId: string;
    stability: number;
    similarity: number;
  };
}
```

**Response:**
```typescript
interface CreateCompanionResponse {
  success: boolean;
  companion: {
    id: string;
    name: string;
    personality: string;
    avatar: string;
    traits: string[];
    familiarity: number;
    createdAt: string;
  };
}
```

**Sample Response:**
```json
{
  "success": true,
  "companion": {
    "id": "comp_789",
    "name": "Sam",
    "personality": "friendly",
    "avatar": "😊",
    "traits": ["warm", "empathetic", "creative"],
    "familiarity": 0,
    "createdAt": "2024-01-15T15:30:00Z"
  }
}
```

#### PUT `/api/companions/{companionId}`
Update an AI companion's settings.

**Request:**
```typescript
interface UpdateCompanionRequest {
  name?: string;
  personality?: string;
  traits?: string[];
  avatar?: string;
  voiceSettings?: VoiceSettings;
}
```

#### DELETE `/api/companions/{companionId}`
Delete an AI companion.

**Response:**
```typescript
interface DeleteCompanionResponse {
  success: boolean;
  message: string;
}
```

### 🧠 Memory Management

#### GET `/api/memory/{companionId}`
Retrieve memories for a specific AI companion.

**Query Parameters:**
- `type` (optional): Filter by memory type ('personal', 'preference', 'experience', 'relationship')
- `limit` (optional): Number of memories (default: 20)
- `search` (optional): Search query for semantic matching

**Examples:**

```bash
# Get recent memories for a companion
curl "https://your-domain.com/api/memory/comp_123?limit=10"

# Get only personal memories
curl "https://your-domain.com/api/memory/comp_123?type=personal&limit=5"

# Search memories semantically
curl "https://your-domain.com/api/memory/comp_123?search=loves%20music&limit=3"
```

```javascript
// JavaScript example
const companionId = 'comp_123';
const response = await fetch(`/api/memory/${companionId}?type=personal&limit=5`);
const data = await response.json();

console.log(`Found ${data.memories.length} personal memories`);
data.memories.forEach(memory => {
  console.log(`- ${memory.content} (${memory.confidence}% confidence)`);
});
```

**Response:**
```typescript
interface MemoryResponse {
  success: boolean;
  memories: Array<{
    id: string;
    type: string;
    content: string;
    confidence: number;
    lastUsed: string;
    createdAt: string;
    metadata: {
      source: string;
      tags: string[];
      embedding?: number[];
    };
  }>;
}
```

**Sample Response:**
```json
{
  "success": true,
  "memories": [
    {
      "id": "mem_456",
      "type": "personal",
      "content": "User enjoys listening to jazz music and plays piano",
      "confidence": 0.92,
      "lastUsed": "2024-01-15T14:30:00Z",
      "createdAt": "2024-01-10T09:15:00Z",
      "metadata": {
        "source": "conversation",
        "tags": ["music", "hobbies", "jazz"],
        "embedding": [0.123, 0.456, ...]
      }
    },
    {
      "id": "mem_789",
      "type": "preference",
      "content": "User prefers tea over coffee in the morning",
      "confidence": 0.88,
      "lastUsed": "2024-01-14T08:20:00Z",
      "createdAt": "2024-01-08T07:30:00Z",
      "metadata": {
        "source": "conversation",
        "tags": ["beverages", "morning", "preferences"]
      }
    }
  ]
}
```

#### POST `/api/memory/{companionId}`
Add or update a memory.

**Examples:**

```bash
# Add a personal memory
curl -X POST https://your-domain.com/api/memory/comp_123 \
  -H "Content-Type: application/json" \
  -d '{
    "type": "personal",
    "content": "User has two cats named Whiskers and Mittens",
    "tags": ["pets", "cats", "family"],
    "confidence": 0.95
  }'

# Add a preference memory
curl -X POST https://your-domain.com/api/memory/comp_123 \
  -H "Content-Type: application/json" \
  -d '{
    "type": "preference",
    "content": "User prefers outdoor activities on weekends",
    "tags": ["lifestyle", "weekends", "outdoors"],
    "confidence": 0.88,
    "metadata": {
      "source": "conversation",
      "topic": "hobbies"
    }
  }'
```

```javascript
// JavaScript example
const memoryData = {
  type: 'experience',
  content: 'User recently traveled to Japan and loved the food',
  tags: ['travel', 'japan', 'food', 'culture'],
  confidence: 0.92
};

const response = await fetch(`/api/memory/comp_123`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(memoryData)
});

const data = await response.json();
console.log(`Memory created with ID: ${data.memory.id}`);
```

**Request:**
```typescript
interface MemoryRequest {
  type: 'personal' | 'preference' | 'experience' | 'relationship' | 'knowledge';
  content: string;
  tags?: string[];
  confidence?: number;
  metadata?: Record<string, any>;
}
```

**Response:**
```typescript
interface MemoryCreateResponse {
  success: boolean;
  memory: {
    id: string;
    type: string;
    content: string;
    confidence: number;
    createdAt: string;
  };
}
```

**Sample Response:**
```json
{
  "success": true,
  "memory": {
    "id": "mem_101",
    "type": "personal",
    "content": "User has two cats named Whiskers and Mittens",
    "confidence": 0.95,
    "createdAt": "2024-01-15T16:00:00Z"
  }
}
```

#### DELETE `/api/memory/{companionId}/{memoryId}`
Delete a specific memory.

#### POST `/api/memory/search`
Search memories across all companions using semantic similarity.

**Examples:**

```bash
# Search all companions for music-related memories
curl -X POST https://your-domain.com/api/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "music and instruments",
    "limit": 5,
    "threshold": 0.7
  }'

# Search specific companion
curl -X POST https://your-domain.com/api/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "favorite foods",
    "companionId": "comp_123",
    "limit": 3
  }'
```

```javascript
// JavaScript example
const searchQuery = {
  query: "travel experiences",
  limit: 10,
  threshold: 0.8
};

const response = await fetch('/api/memory/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(searchQuery)
});

const data = await response.json();
console.log(`Found ${data.results.length} relevant memories`);

data.results.forEach(result => {
  console.log(`${result.similarity.toFixed(2)}: ${result.excerpt}`);
});
```

```python
# Python example
import requests

search_payload = {
    "query": "hobbies and interests",
    "limit": 5,
    "threshold": 0.75
}

response = requests.post('https://your-domain.com/api/memory/search', json=search_payload)
data = response.json()

for result in data['results']:
    print(f"Similarity: {result['similarity']:.2f}")
    print(f"Excerpt: {result['excerpt']}")
    print("---")
```

**Request:**
```typescript
interface MemorySearchRequest {
  query: string;
  companionId?: string; // Optional: search specific companion
  limit?: number;
  threshold?: number; // Similarity threshold 0-1
}
```

**Response:**
```typescript
interface MemorySearchResponse {
  success: boolean;
  results: Array<{
    memory: Memory;
    companionId: string;
    similarity: number;
    excerpt: string;
  }>;
}
```

**Sample Response:**
```json
{
  "success": true,
  "results": [
    {
      "memory": {
        "id": "mem_456",
        "type": "personal",
        "content": "User plays guitar and enjoys jazz music concerts",
        "confidence": 0.91,
        "lastUsed": "2024-01-14T20:00:00Z",
        "createdAt": "2024-01-10T15:30:00Z",
        "metadata": {
          "source": "conversation",
          "tags": ["music", "guitar", "jazz"]
        }
      },
      "companionId": "comp_123",
      "similarity": 0.89,
      "excerpt": "User plays guitar and enjoys jazz music concerts"
    },
    {
      "memory": {
        "id": "mem_789",
        "type": "experience",
        "content": "User attended a piano concert last month",
        "confidence": 0.85,
        "lastUsed": "2024-01-12T18:45:00Z",
        "createdAt": "2024-01-05T12:00:00Z",
        "metadata": {
          "source": "conversation",
          "tags": ["music", "concert", "piano"]
        }
      },
      "companionId": "comp_456",
      "similarity": 0.76,
      "excerpt": "User attended a piano concert last month"
    }
  ]
}
```

### 📚 Knowledge Base

#### POST `/api/knowledge/process`
Process and store new knowledge content.

**Request:**
```typescript
interface KnowledgeProcessRequest {
  type: 'document' | 'url' | 'video';
  content?: string; // For direct content
  sourceUrl?: string; // For URLs/videos
  title?: string;
  companionId: string;
  tags?: string[];
}
```

**Supported Content Types:**
- **Document**: Text files, PDFs, DOCX
- **URL**: Web pages and articles
- **Video**: YouTube, Vimeo, direct video URLs

**Response:**
```typescript
interface KnowledgeProcessResponse {
  success: boolean;
  document: {
    id: string;
    title: string;
    type: string;
    wordCount: number;
    topics: string[];
    entities: Array<{
      name: string;
      type: string;
      confidence: number;
    }>;
    summary: string;
    keyPoints: string[];
    processedAt: string;
  };
}
```

#### GET `/api/knowledge/search`
Search the knowledge base.

**Query Parameters:**
- `query`: Search terms
- `companionId` (optional): Filter by companion
- `type` (optional): Filter by content type
- `limit` (optional): Results limit (default: 10)

**Response:**
```typescript
interface KnowledgeSearchResponse {
  success: boolean;
  results: Array<{
    document: KnowledgeDocument;
    relevanceScore: number;
    excerpt: string;
    matchedEntities: string[];
  }>;
  totalResults: number;
}
```

#### GET `/api/knowledge/stats`
Get knowledge base statistics.

**Response:**
```typescript
interface KnowledgeStatsResponse {
  success: boolean;
  stats: {
    totalDocuments: number;
    totalWords: number;
    topTopics: string[];
    topEntities: Array<{
      name: string;
      type: string;
      mentions: number;
    }>;
    averageRelevance: number;
    lastUpdated: string;
  };
}
```

### 🎙️ Voice Processing

#### POST `/api/voice/transcribe`
Convert speech to text using Whisper.

**Examples:**

```bash
# Transcribe an audio file (assuming audio.wav exists)
curl -X POST https://your-domain.com/api/voice/transcribe \
  -F "file=@audio.wav" \
  -F "model=whisper-1" \
  -F "language=en"
```

```javascript
// JavaScript example - transcribe from microphone
async function transcribeAudio(audioBlob) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const response = await fetch('/api/voice/transcribe', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  console.log(`Transcription: ${data.transcription}`);
  console.log(`Confidence: ${(data.confidence * 100).toFixed(1)}%`);
  return data;
}

// Usage with MediaRecorder
async function recordAndTranscribe() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks = [];

  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const result = await transcribeAudio(blob);
    console.log('Transcribed:', result.transcription);
  };

  recorder.start();
  setTimeout(() => recorder.stop(), 5000); // Record for 5 seconds
}
```

**Request:**
- Content-Type: `multipart/form-data`
- Body: Audio file (WebM, MP3, WAV, etc.)

**Response:**
```typescript
interface VoiceTranscribeResponse {
  success: boolean;
  transcription: string;
  confidence: number;
  language: string;
  duration: number;
  metadata: {
    model: string;
    processingTime: number;
  };
}
```

**Sample Response:**
```json
{
  "success": true,
  "transcription": "Hello, how are you doing today?",
  "confidence": 0.95,
  "language": "en",
  "duration": 2.3,
  "metadata": {
    "model": "whisper-1",
    "processingTime": 1200
  }
}
```

#### POST `/api/voice/synthesize`
Convert text to speech using ElevenLabs.

**Examples:**

```bash
# Generate speech with default settings
curl -X POST https://your-domain.com/api/voice/synthesize \
  -H "Content-Type: application/json" \
  -o speech.mp3 \
  -d '{
    "text": "Hello! How are you doing today?",
    "voiceId": "21m00Tcm4TlvDq8ikWAM"
  }'

# Generate speech with custom voice settings
curl -X POST https://your-domain.com/api/voice/synthesize \
  -H "Content-Type: application/json" \
  -o speech.mp3 \
  -d '{
    "text": "Welcome to our conversation!",
    "voiceId": "ErXwobaYiN019PkySvjV",
    "voiceSettings": {
      "stability": 0.8,
      "similarity_boost": 0.9,
      "style": 0.6,
      "use_speaker_boost": true
    }
  }'
```

```javascript
// JavaScript example - generate and play speech
async function generateSpeech(text, voiceId) {
  const response = await fetch('/api/voice/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voiceId,
      voiceSettings: {
        stability: 0.75,
        similarity_boost: 0.8,
        style: 0.5,
        use_speaker_boost: true
      }
    })
  });

  if (response.ok) {
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
    return audioUrl;
  } else {
    throw new Error('Speech generation failed');
  }
}

// Usage
const audioUrl = await generateSpeech("Hello there!", "21m00Tcm4TlvDq8ikWAM");
```

```python
# Python example
import requests

def text_to_speech(text, voice_id, output_file="output.mp3"):
    payload = {
        "text": text,
        "voiceId": voice_id,
        "voiceSettings": {
            "stability": 0.8,
            "similarity_boost": 0.9,
            "style": 0.7,
            "use_speaker_boost": True
        }
    }

    response = requests.post('https://your-domain.com/api/voice/synthesize', json=payload)

    if response.status_code == 200:
        with open(output_file, 'wb') as f:
            f.write(response.content)
        print(f"Audio saved to {output_file}")
    else:
        print(f"Error: {response.status_code}")

# Usage
text_to_speech("Welcome to AI Hive Mind!", "21m00Tcm4TlvDq8ikWAM")
```

**Request:**
```typescript
interface VoiceSynthesizeRequest {
  text: string;
  voiceId: string;
  voiceSettings?: {
    stability: number;      // 0-1
    similarity_boost: number; // 0-1
    style: number;          // 0-1
    use_speaker_boost: boolean;
  };
}
```

**Response:**
- Content-Type: `audio/mpeg`
- Body: Audio file data (binary)

#### GET `/api/voice/voices`
List available ElevenLabs voices.

**Response:**
```typescript
interface VoicesResponse {
  success: boolean;
  voices: Array<{
    voice_id: string;
    name: string;
    category: string;
    labels: Record<string, string>;
    preview_url: string;
  }>;
}
```

### 🛡️ Safety & Moderation

#### POST `/api/safety/check`
Check content for safety violations.

**Request:**
```typescript
interface SafetyCheckRequest {
  content: string;
  type: 'text' | 'image' | 'audio';
  context?: string;
}
```

**Response:**
```typescript
interface SafetyCheckResponse {
  success: boolean;
  safe: boolean;
  violations: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    position?: {
      start: number;
      end: number;
    };
  }>;
  recommendations: string[];
}
```

#### GET `/api/safety/stats`
Get safety and moderation statistics.

**Response:**
```typescript
interface SafetyStatsResponse {
  success: boolean;
  stats: {
    totalChecks: number;
    violations: number;
    violationRate: number;
    topViolationTypes: Array<{
      type: string;
      count: number;
    }>;
    recentActivity: Array<{
      timestamp: string;
      action: string;
      severity: string;
    }>;
  };
}
```

### 📊 Analytics & Insights

#### GET `/api/analytics/overview`
Get system-wide analytics.

**Query Parameters:**
- `period`: 'day' | 'week' | 'month' | 'year'

**Response:**
```typescript
interface AnalyticsOverviewResponse {
  success: boolean;
  analytics: {
    period: string;
    totalUsers: number;
    activeUsers: number;
    totalConversations: number;
    averageSessionLength: number;
    popularCompanions: Array<{
      companionId: string;
      name: string;
      usageCount: number;
    }>;
    topTopics: string[];
    systemHealth: {
      uptime: number;
      responseTime: number;
      errorRate: number;
    };
  };
}
```

#### GET `/api/analytics/companion/{companionId}`
Get analytics for a specific companion.

**Response:**
```typescript
interface CompanionAnalyticsResponse {
  success: boolean;
  companionId: string;
  analytics: {
    totalInteractions: number;
    uniqueUsers: number;
    averageResponseTime: number;
    satisfactionScore: number;
    topMemories: Memory[];
    relationshipProgression: Array<{
      date: string;
      familiarity: number;
      interactionCount: number;
    }>;
    personalityMetrics: {
      empathy: number;
      creativity: number;
      consistency: number;
    };
  };
}
```

### 🔧 System Management

#### GET `/api/health`
System health check.

**Examples:**

```bash
# Check system health
curl https://your-domain.com/api/health
```

```javascript
// JavaScript health check with retry logic
async function checkHealth(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/health');
      const health = await response.json();

      if (health.status === 'healthy') {
        console.log('✅ System is healthy');
        return health;
      } else {
        console.warn(`⚠️ System status: ${health.status}`);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error(`❌ Health check failed (attempt ${i + 1}):`, error);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  throw new Error('Health check failed after all retries');
}
```

**Response:**
```typescript
interface HealthResponse {
  success: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    ollama: 'up' | 'down';
    voiceApis: 'up' | 'down';
  };
  metrics: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
}
```

**Sample Response:**
```json
{
  "success": true,
  "status": "healthy",
  "services": {
    "database": "up",
    "redis": "up",
    "ollama": "up",
    "voiceApis": "up"
  },
  "metrics": {
    "uptime": 3600000,
    "memoryUsage": 245760000,
    "cpuUsage": 0.15,
    "activeConnections": 23
  }
}
```

#### POST `/api/backup`
Create system backup.

**Request:**
```typescript
interface BackupRequest {
  type: 'full' | 'incremental';
  includeData: boolean;
  includeConfig: boolean;
}
```

**Response:**
```typescript
interface BackupResponse {
  success: boolean;
  backupId: string;
  size: number;
  downloadUrl: string;
  expiresAt: string;
}
```

#### POST `/api/restore`
Restore from backup.

**Request:**
```typescript
interface RestoreRequest {
  backupId: string;
  confirm: boolean; // Safety confirmation
}
```

## Integration Patterns

### Complete Chat Integration

```javascript
class AIHiveMindClient {
  constructor(baseUrl = '/api', apiKey = null) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async sendMessage(message, companionId = null, options = {}) {
    const payload = {
      message,
      companionId: companionId || 'ai-hive-mind',
      options: {
        voice: options.voice || false,
        temperature: options.temperature || 0.7,
        ...options
      }
    };

    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Chat API error: ${error.error?.message || response.statusText}`);
    }

    return await response.json();
  }

  async getCompanions() {
    const response = await fetch(`${this.baseUrl}/companions`);
    return await response.json();
  }

  async getChatHistory(companionId = null, limit = 20) {
    const params = new URLSearchParams();
    if (companionId) params.set('companionId', companionId);
    params.set('limit', limit.toString());

    const response = await fetch(`${this.baseUrl}/chat/history?${params}`);
    return await response.json();
  }

  async transcribeAudio(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob);

    const response = await fetch(`${this.baseUrl}/voice/transcribe`, {
      method: 'POST',
      body: formData
    });

    return await response.json();
  }

  async generateSpeech(text, voiceId) {
    const response = await fetch(`${this.baseUrl}/voice/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId })
    });

    if (response.ok) {
      return await response.blob();
    } else {
      throw new Error('Speech generation failed');
    }
  }
}

// Usage example
const client = new AIHiveMindClient();

async function chatWithAI() {
  try {
    // Send a message
    const response = await client.sendMessage("Hello!", "friendly-companion");
    console.log("AI Response:", response.response.text);

    // Get chat history
    const history = await client.getChatHistory("friendly-companion", 5);
    console.log("Recent conversations:", history.conversations.length);

  } catch (error) {
    console.error("Integration error:", error);
  }
}
```

### Voice-First Integration

```javascript
class VoiceChatInterface {
  constructor(aiClient) {
    this.aiClient = aiClient;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  async startVoiceChat() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

        try {
          // Transcribe speech to text
          const transcription = await this.aiClient.transcribeAudio(audioBlob);
          console.log("You said:", transcription.transcription);

          // Send to AI for response
          const aiResponse = await this.aiClient.sendMessage(
            transcription.transcription,
            null,
            { voice: true }
          );

          console.log("AI Response:", aiResponse.response.text);

          // Generate speech response
          if (aiResponse.voice?.audioUrl) {
            const audio = new Audio(aiResponse.voice.audioUrl);
            audio.play();
          }

        } catch (error) {
          console.error("Voice chat error:", error);
        }

        this.audioChunks = [];
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      console.log("🎤 Listening... Click stop to send.");

    } catch (error) {
      console.error("Failed to start voice chat:", error);
    }
  }

  stopVoiceChat() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      console.log("🛑 Processing your message...");
    }
  }
}
```

### Error Handling Examples

```javascript
// Comprehensive error handling
async function robustChatIntegration(message) {
  try {
    // Check system health first
    const health = await fetch('/api/health').then(r => r.json());
    if (health.status !== 'healthy') {
      console.warn('System is not fully healthy:', health.status);
    }

    // Attempt chat
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      switch (response.status) {
        case 400:
          throw new Error(`Invalid request: ${errorData.error?.message || 'Bad request'}`);
        case 401:
          throw new Error('Authentication required. Please log in.');
        case 429:
          throw new Error('Too many requests. Please wait and try again.');
        case 503:
          throw new Error('Service temporarily unavailable. Please try again later.');
        default:
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    return data;

  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network connection failed. Check your internet connection.');
    }
    throw error;
  }
}

// Usage with retry logic
async function sendMessageWithRetry(message, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await robustChatIntegration(message);
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}
```

## Error Handling

All API endpoints follow consistent error response format:

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}
```

### Common Error Codes

- `AUTH_REQUIRED`: Authentication required
- `AUTH_INVALID`: Invalid credentials
- `PERMISSION_DENIED`: Insufficient permissions
- `RATE_LIMITED`: Too many requests
- `CONTENT_BLOCKED`: Content violates safety rules
- `SERVICE_UNAVAILABLE`: External service down
- `VALIDATION_ERROR`: Invalid request data
- `NOT_FOUND`: Resource not found

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Chat endpoints**: 50 requests per minute
- **Memory operations**: 100 requests per minute
- **Knowledge processing**: 10 requests per minute
- **Voice operations**: 20 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 49
X-RateLimit-Reset: 1640995200
```

## WebSocket Support

### Real-time Chat
```javascript
const ws = new WebSocket('wss://your-domain.com/api/live');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle real-time messages
};
```

### Streaming Responses
For long AI responses, use streaming:
```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Tell me a story',
    options: { stream: true }
  })
});

const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // Process streaming chunks
}
```

## SDKs and Libraries

### JavaScript SDK
```bash
npm install ai-hive-mind-sdk
```

```javascript
import { HiveMindClient } from 'ai-hive-mind-sdk';

const client = new HiveMindClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://your-domain.com'
});

// Send a message
const response = await client.chat({
  message: 'Hello!',
  companionId: 'ai-hive-mind'
});
```

### Python SDK
```bash
pip install ai-hive-mind
```

```python
from ai_hive_mind import HiveMindClient

client = HiveMindClient(api_key='your-api-key')

response = client.chat(
    message='Hello!',
    companion_id='ai-hive-mind'
)
```

## Versioning

API versioning follows semantic versioning:
- **v1**: Current stable version
- **Breaking changes**: New major version
- **Additions**: Minor version bump
- **Bug fixes**: Patch version bump

Specify version in URL:
```
https://your-domain.com/api/v1/chat
```

## Support

### Getting Help

- **API Documentation**: This document
- **Code Examples**: `/examples` directory
- **Community Forum**: GitHub Discussions
- **Issue Tracker**: GitHub Issues

### Service Status

Check system status: `GET /api/health`

Monitor service availability and performance metrics.

---

This API reference provides comprehensive documentation for integrating with the AI Hive Mind system. All endpoints are designed for reliability, security, and ease of use.