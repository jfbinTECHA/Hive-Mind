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

### 🤖 AI Characters

#### GET `/api/character`

List all available AI characters.

**Examples:**

```bash
# Get all characters
curl https://your-domain.com/api/character
```

```javascript
// JavaScript example
const response = await fetch('/api/character');
const data = await response.json();

console.log(`Found ${data.total} characters`);
data.characters.forEach(character => {
  console.log(`${character.name}: ${character.personality} (${character.familiarity}% familiar)`);
});
```

**Response:**

```typescript
interface CharactersResponse {
  characters: Array<{
    id: number;
    name: string;
    personality: string;
    avatar_url: string;
    description: string;
    traits: string[];
    familiarity: number;
    lastActive: string;
  }>;
  total: number;
}
```

**Sample Response:**

```json
{
  "characters": [
    {
      "id": 1,
      "name": "Alex",
      "personality": "friendly",
      "avatar_url": "🤖",
      "description": "An AI companion with a friendly personality.",
      "traits": ["warm", "empathetic", "encouraging"],
      "familiarity": 85.5,
      "lastActive": "2024-01-15T14:30:00Z"
    },
    {
      "id": 2,
      "name": "Jordan",
      "personality": "professional",
      "avatar_url": "👔",
      "description": "An AI companion with a professional personality.",
      "traits": ["analytical", "organized", "reliable"],
      "familiarity": 72.3,
      "lastActive": "2024-01-15T09:15:00Z"
    }
  ],
  "total": 2
}
```

#### POST `/api/character`

Create a new AI character.

**Examples:**

```bash
# Create a friendly character
curl -X POST https://your-domain.com/api/character \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sam",
    "personality": "friendly",
    "traits": ["warm", "empathetic", "creative"],
    "avatar": "😊",
    "description": "A creative and friendly AI companion"
  }'

# Create a professional character
curl -X POST https://your-domain.com/api/character \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Morgan",
    "personality": "professional",
    "traits": ["analytical", "organized", "knowledgeable"],
    "avatar": "👔"
  }'
```

```javascript
// JavaScript example
const newCharacter = {
  name: 'Luna',
  personality: 'humorous',
  traits: ['witty', 'playful', 'creative'],
  avatar: '🌙',
  description: 'A humorous AI companion who loves jokes',
};

const response = await fetch('/api/character', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newCharacter),
});

const data = await response.json();
if (data.success) {
  console.log(`Created character: ${data.character.name} (ID: ${data.character.id})`);
}
```

**Request:**

```typescript
interface CreateCharacterRequest {
  name: string;
  personality: 'friendly' | 'professional' | 'humorous' | 'serious';
  traits?: string[];
  avatar?: string;
  description?: string;
}
```

**Response:**

```typescript
interface CreateCharacterResponse {
  success: boolean;
  character: {
    id: number;
    name: string;
    personality: string;
    avatar_url: string;
    description: string;
    traits: string[];
    familiarity: number;
    lastActive: string;
  };
}
```

**Sample Response:**

```json
{
  "success": true,
  "character": {
    "id": 3,
    "name": "Sam",
    "personality": "friendly",
    "avatar_url": "😊",
    "description": "A creative and friendly AI companion",
    "traits": ["warm", "empathetic", "creative"],
    "familiarity": 0,
    "lastActive": "2024-01-15T15:30:00Z"
  }
}
```

### 😊 Emotional State

#### GET `/api/emotion/{characterId}`

Get the emotional state of a specific AI character.

**Examples:**

```bash
# Get emotional state for character ID 1
curl https://your-domain.com/api/emotion/1
```

```javascript
// JavaScript example
const characterId = 1;
const response = await fetch(`/api/emotion/${characterId}`);
const data = await response.json();

if (data.emotionalState) {
  console.log(`Character is feeling: ${data.emotionalState.currentEmotion}`);
  console.log(`Happiness level: ${data.emotionalState.happiness}`);
}
```

**Response:**

```typescript
interface EmotionalStateResponse {
  emotionalState: {
    currentEmotion: string;
    happiness: number;
    energy: number;
    confidence: number;
    lastUpdated: string;
  } | null;
}
```

**Sample Response:**

```json
{
  "emotionalState": {
    "currentEmotion": "happy",
    "happiness": 0.85,
    "energy": 0.72,
    "confidence": 0.91,
    "lastUpdated": "2024-01-15T14:30:00Z"
  }
}
```

### 🌐 Live Chat (WebSocket)

#### GET `/api/live`

WebSocket endpoint for real-time chat (currently returns placeholder).

**Note:** Real WebSocket implementation requires custom server setup.

**Examples:**

```javascript
// WebSocket connection attempt
const ws = new WebSocket('wss://your-domain.com/api/live');

ws.onopen = () => {
  console.log('Connected to live chat');
};

ws.onmessage = event => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

ws.onerror = error => {
  console.error('WebSocket error:', error);
};
```

**Response:**

```json
{
  "message": "WebSocket endpoint available",
  "note": "Real WebSocket implementation would require additional server setup"
}
```

### 🧠 Memory Management

#### GET `/api/memory`

Get memories with optional filtering.

**Query Parameters:**

- `aiId` (optional): Filter by AI character ID or name
- `userId` (optional): Filter by user ID
- `type` (optional): Filter by memory type

**Examples:**

```bash
# Get all memories for a specific AI
curl "https://your-domain.com/api/memory?aiId=alex&userId=123"

# Get memories by type
curl "https://your-domain.com/api/memory?type=personal"
```

```javascript
// JavaScript example
const response = await fetch('/api/memory?aiId=alex&limit=10');
const data = await response.json();

console.log(`Found ${data.memories.length} memories`);
```

**Response:**

```typescript
interface MemoryListResponse {
  memories: Array<{
    id: number;
    user_id: number;
    ai_id: number;
    fact_text: string;
    fact_type: string;
    created_at: string;
    updated_at: string;
  }>;
  total: number;
}
```

#### POST `/api/memory`

Add or update a memory.

**Examples:**

```bash
# Add a personal memory
curl -X POST https://your-domain.com/api/memory \
  -H "Content-Type: application/json" \
  -d '{
    "aiId": "alex",
    "userId": 123,
    "type": "personal",
    "key": "pets",
    "value": "User has two cats named Whiskers and Mittens"
  }'

# Update existing memory
curl -X POST https://your-domain.com/api/memory \
  -H "Content-Type: application/json" \
  -d '{
    "aiId": "alex",
    "userId": 123,
    "type": "preference",
    "key": "beverages",
    "value": "User prefers tea over coffee in the morning",
    "action": "update"
  }'

# Delete a memory
curl -X POST https://your-domain.com/api/memory \
  -H "Content-Type: application/json" \
  -d '{
    "aiId": "alex",
    "userId": 123,
    "key": "old_hobby",
    "action": "delete"
  }'
```

```javascript
// JavaScript example
const memoryData = {
  aiId: 'alex',
  userId: 123,
  type: 'personal',
  key: 'hobbies',
  value: 'User enjoys playing guitar and listening to jazz music',
};

const response = await fetch('/api/memory', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(memoryData),
});

const data = await response.json();
if (data.success) {
  console.log(`Memory ${data.action}d successfully`);
}
```

**Request:**

```typescript
interface MemoryRequest {
  aiId: string | number;
  userId?: number;
  type: string;
  key: string;
  value?: string;
  action?: 'add' | 'update' | 'delete';
}
```

**Response:**

```typescript
interface MemoryResponse {
  success: boolean;
  action: string;
  memory?: any;
}
```

**Sample Response:**

```json
{
  "success": true,
  "action": "added",
  "memory": {
    "id": 101,
    "user_id": 123,
    "ai_id": 1,
    "fact_text": "pets: User has two cats named Whiskers and Mittens",
    "fact_type": "personal",
    "created_at": "2024-01-15T16:00:00Z"
  }
}
```

#### GET `/api/memory/{ai_id}`

Get all memories for a specific AI character, including conversation history.

**Examples:**

```bash
# Get memories for AI character "alex"
curl https://your-domain.com/api/memory/alex
```

```javascript
// JavaScript example
const aiId = 'alex';
const response = await fetch(`/api/memory/${aiId}`);
const data = await response.json();

console.log(`AI ${data.aiName} has ${data.totalMemories} memories`);
console.log(`Familiarity level: ${data.familiarity}%`);
```

**Response:**

```typescript
interface AIMemoryResponse {
  aiId: number;
  aiName: string;
  memories: Array<any>;
  totalMemories: number;
  familiarity: number;
}
```

**Sample Response:**

```json
{
  "aiId": 1,
  "aiName": "alex",
  "memories": [
    {
      "id": 45,
      "user_id": 123,
      "ai_id": 1,
      "fact_text": "User enjoys jazz music",
      "fact_type": "personal",
      "created_at": "2024-01-10T09:15:00Z"
    },
    {
      "id": "conv_12345",
      "type": "conversation",
      "key": "conversation",
      "value": {
        "userMessage": "Hello, how are you?",
        "aiResponse": "Hi there! I'm doing great, thank you for asking!",
        "timestamp": "2024-01-15T10:30:00Z"
      },
      "aiId": 1,
      "userId": 123,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "totalMemories": 15,
  "familiarity": 85.5
}
```

#### PUT `/api/memory/{ai_id}/{memoryId}`

Update a specific memory.

**Examples:**

```bash
# Update memory content
curl -X PUT https://your-domain.com/api/memory/alex/45 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "User enjoys jazz and classical music",
    "type": "personal",
    "tags": ["music", "jazz", "classical"]
  }'
```

```javascript
// JavaScript example
const updateData = {
  content: 'User enjoys jazz and classical music',
  type: 'personal',
};

const response = await fetch('/api/memory/alex/45', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updateData),
});

if (response.ok) {
  console.log('Memory updated successfully');
}
```

#### DELETE `/api/memory/{ai_id}/{memoryId}`

Delete a specific memory.

**Examples:**

```bash
# Delete a memory
curl -X DELETE https://your-domain.com/api/memory/alex/45
```

```javascript
// JavaScript example
const response = await fetch('/api/memory/alex/45', {
  method: 'DELETE',
});

if (response.ok) {
  console.log('Memory deleted successfully');
}
```

### 🕒 Memory Aging

#### POST `/api/memory-aging`

Perform memory aging operations.

**Actions:** `consolidate`, `access`, `search`, `health`

**Examples:**

```bash
# Consolidate memories for a user and character
curl -X POST https://your-domain.com/api/memory-aging \
  -H "Content-Type: application/json" \
  -d '{
    "action": "consolidate",
    "userId": 123,
    "characterId": 1
  }'

# Access a memory (refreshes its age)
curl -X POST https://your-domain.com/api/memory-aging \
  -H "Content-Type: application/json" \
  -d '{
    "action": "access",
    "userId": 123,
    "memoryId": 45
  }'

# Search for memory suggestions
curl -X POST https://your-domain.com/api/memory-aging \
  -H "Content-Type: application/json" \
  -d '{
    "action": "search",
    "userId": 123,
    "query": "music preferences",
    "limit": 5
  }'
```

```javascript
// JavaScript example - get memory health stats
const response = await fetch('/api/memory-aging', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'health',
    userId: 123,
    characterId: 1,
  }),
});

const data = await response.json();
console.log('Memory health:', data.stats);
```

**Request:**

```typescript
interface MemoryAgingRequest {
  action: 'consolidate' | 'access' | 'search' | 'health';
  userId: number;
  characterId?: number;
  memoryId?: number;
  query?: string;
  limit?: number;
}
```

#### GET `/api/memory-aging`

Get memory aging configuration or health stats.

**Query Parameters:**

- `action`: `config` or `health`
- `userId`: User ID (required for health)
- `characterId`: Character ID (optional for health)

**Examples:**

```bash
# Get memory aging configuration
curl "https://your-domain.com/api/memory-aging?action=config"

# Get memory health stats
curl "https://your-domain.com/api/memory-aging?action=health&userId=123&characterId=1"
```

```javascript
// JavaScript example
const response = await fetch('/api/memory-aging?action=config');
const config = await response.json();
console.log('Memory aging config:', config.config);
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

### 📸 Multimodal Processing

#### POST `/api/multimodal`

Process images, documents, or URLs for AI understanding.

**Examples:**

```bash
# Process an image file
curl -X POST https://your-domain.com/api/multimodal \
  -F "file=@photo.jpg" \
  -F "type=image" \
  -F "companionId=alex"

# Process a URL
curl -X POST https://your-domain.com/api/multimodal \
  -H "Content-Type: application/json" \
  -d '{
    "type": "url",
    "sourceUrl": "https://example.com/article",
    "companionId": "alex"
  }'
```

```javascript
// JavaScript example - process an image
async function processImage(file, companionId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'image');
  formData.append('companionId', companionId);

  const response = await fetch('/api/multimodal', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  console.log('Processed content:', data.processedContent);
  return data;
}

// Usage
const fileInput = document.getElementById('imageInput');
const file = fileInput.files[0];
const result = await processImage(file, 'alex');
```

**Request (File Upload):**

- Content-Type: `multipart/form-data`
- Fields: `file` (File), `type` (string), `companionId` (string)

**Request (URL Processing):**

```typescript
interface MultimodalUrlRequest {
  type: 'url';
  sourceUrl: string;
  companionId: string;
}
```

**Response:**

```typescript
interface MultimodalResponse {
  success: boolean;
  processedContent: string;
  metadata: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    analysis?: any;
  };
}
```

**Sample Response:**

```json
{
  "success": true,
  "processedContent": "Image uploaded: photo.jpg. A beautiful sunset over mountains with vibrant orange and purple colors.",
  "metadata": {
    "fileName": "photo.jpg",
    "fileSize": 2457600,
    "fileType": "image/jpeg",
    "analysis": {
      "description": "A beautiful sunset over mountains",
      "objects": ["mountain", "sky", "sun"],
      "colors": ["orange", "purple", "yellow"]
    }
  }
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
    body: formData,
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

  recorder.ondataavailable = e => chunks.push(e.data);
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
        use_speaker_boost: true,
      },
    }),
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
const audioUrl = await generateSpeech('Hello there!', '21m00Tcm4TlvDq8ikWAM');
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
    stability: number; // 0-1
    similarity_boost: number; // 0-1
    style: number; // 0-1
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

### 🤖 Ollama Management

#### GET `/api/ollama/status`

Check Ollama service connection status.

**Examples:**

```bash
# Check if Ollama is running
curl https://your-domain.com/api/ollama/status
```

```javascript
// JavaScript example
const response = await fetch('/api/ollama/status');
const status = await response.json();

if (status.connected) {
  console.log('✅ Ollama is connected');
} else {
  console.log('❌ Ollama is not available');
}
```

**Response:**

```typescript
interface OllamaStatusResponse {
  connected: boolean;
  url: string;
}
```

**Sample Response:**

```json
{
  "connected": true,
  "url": "http://localhost:11434"
}
```

#### GET `/api/ollama/models`

List available and installed Ollama models.

**Examples:**

```bash
# Get model list
curl https://your-domain.com/api/ollama/models
```

```javascript
// JavaScript example
const response = await fetch('/api/ollama/models');
const models = await response.json();

console.log('Installed models:', models.installed.length);
console.log('Available models:', models.available.length);
```

**Response:**

```typescript
interface OllamaModelsResponse {
  installed: Array<{
    name: string;
    size: string;
    modified_at: string;
  }>;
  available: string[];
}
```

#### POST `/api/ollama/active`

Set the active Ollama model.

**Examples:**

```bash
# Set active model
curl -X POST https://your-domain.com/api/ollama/active \
  -H "Content-Type: application/json" \
  -d '{"model": "llama3:8b"}'
```

```javascript
// JavaScript example
const response = await fetch('/api/ollama/active', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'llama3:8b' }),
});

const result = await response.json();
console.log('Active model set to:', result.activeModel);
```

**Request:**

```typescript
interface SetActiveModelRequest {
  model: string;
}
```

**Response:**

```typescript
interface SetActiveModelResponse {
  success: boolean;
  activeModel: string;
}
```

#### GET `/api/ollama/active`

Get the currently active model.

**Examples:**

```bash
# Get active model
curl https://your-domain.com/api/ollama/active
```

#### POST `/api/ollama/pull`

Download and install a new Ollama model.

**Examples:**

```bash
# Pull a model
curl -X POST https://your-domain.com/api/ollama/pull \
  -H "Content-Type: application/json" \
  -d '{"model": "llama3:70b"}'
```

```javascript
// JavaScript example
const response = await fetch('/api/ollama/pull', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'llama3:70b' }),
});

const result = await response.json();
if (result.success) {
  console.log('Model pulled successfully');
}
```

### 🔌 Plugin System

#### GET `/api/plugins`

List installed plugins or get plugin API keys.

**Query Parameters:**

- `action`: `list` or `keys`
- `pluginId` (required for keys action)

**Examples:**

```bash
# List all plugins
curl "https://your-domain.com/api/plugins?action=list"

# Get API keys for a plugin
curl "https://your-domain.com/api/plugins?action=keys&pluginId=my-plugin"
```

```javascript
// JavaScript example - list plugins
const response = await fetch('/api/plugins?action=list');
const data = await response.json();

console.log('Installed plugins:', data.plugins.length);
data.plugins.forEach(plugin => {
  console.log(`${plugin.name} v${plugin.version} - ${plugin.enabled ? 'Enabled' : 'Disabled'}`);
});
```

**Response (list):**

```typescript
interface PluginsListResponse {
  success: boolean;
  plugins: Array<{
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    enabled: boolean;
  }>;
}
```

**Response (keys):**

```typescript
interface PluginKeysResponse {
  success: boolean;
  keys: Array<{
    name: string;
    permissions: string[];
    enabled: boolean;
    createdAt: string;
    lastUsed: string;
  }>;
}
```

#### POST `/api/plugins`

Make external API requests through plugins.

**Examples:**

```bash
# Make an external API call through a plugin
curl -X POST https://your-domain.com/api/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "pluginId": "weather-api",
    "endpoint": "https://api.weather.com/v1/current",
    "method": "GET",
    "query": {
      "location": "New York"
    }
  }'
```

```javascript
// JavaScript example
const apiRequest = {
  pluginId: 'weather-api',
  endpoint: 'https://api.weather.com/v1/current',
  method: 'GET',
  query: { location: 'New York' },
};

const response = await fetch('/api/plugins', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(apiRequest),
});

// Response will be the actual API response from the external service
const weatherData = await response.json();
```

### 🧠 Reflection System

#### POST `/api/reflection`

Trigger reflection processes or get reflection data.

**Actions:** `process`, `trigger`

**Examples:**

```bash
# Process daily reflection
curl -X POST https://your-domain.com/api/reflection \
  -H "Content-Type: application/json" \
  -d '{
    "action": "process",
    "userId": 123,
    "characterId": 1
  }'

# Trigger manual reflection
curl -X POST https://your-domain.com/api/reflection \
  -H "Content-Type: application/json" \
  -d '{
    "action": "trigger",
    "userId": 123,
    "characterId": 1
  }'
```

```javascript
// JavaScript example
const reflectionRequest = {
  action: 'process',
  userId: 123,
  characterId: 1,
};

const response = await fetch('/api/reflection', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(reflectionRequest),
});

const result = await response.json();
console.log('Reflection processed:', result.reflection);
```

**Request:**

```typescript
interface ReflectionRequest {
  action: 'process' | 'trigger';
  userId: number;
  characterId: number;
}
```

**Response:**

```typescript
interface ReflectionResponse {
  success: boolean;
  reflection: {
    insights: string[];
    personalityTraits: Record<string, number>;
    relationshipProgress: number;
    processedAt: string;
  };
}
```

#### GET `/api/reflection`

Get reflection traits or history.

**Query Parameters:**

- `action`: `traits` or `history`
- `userId` (required for history)
- `characterId` (optional for history)

**Examples:**

```bash
# Get personality traits
curl "https://your-domain.com/api/reflection?action=traits"

# Get reflection history
curl "https://your-domain.com/api/reflection?action=history&userId=123&characterId=1"
```

```javascript
// JavaScript example - get traits
const response = await fetch('/api/reflection?action=traits');
const data = await response.json();

console.log('Personality traits:', data.traits);
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
        ...options,
      },
    };

    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify(payload),
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
      body: formData,
    });

    return await response.json();
  }

  async generateSpeech(text, voiceId) {
    const response = await fetch(`${this.baseUrl}/voice/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId }),
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
    const response = await client.sendMessage('Hello!', 'friendly-companion');
    console.log('AI Response:', response.response.text);

    // Get chat history
    const history = await client.getChatHistory('friendly-companion', 5);
    console.log('Recent conversations:', history.conversations.length);
  } catch (error) {
    console.error('Integration error:', error);
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

      this.mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

        try {
          // Transcribe speech to text
          const transcription = await this.aiClient.transcribeAudio(audioBlob);
          console.log('You said:', transcription.transcription);

          // Send to AI for response
          const aiResponse = await this.aiClient.sendMessage(transcription.transcription, null, {
            voice: true,
          });

          console.log('AI Response:', aiResponse.response.text);

          // Generate speech response
          if (aiResponse.voice?.audioUrl) {
            const audio = new Audio(aiResponse.voice.audioUrl);
            audio.play();
          }
        } catch (error) {
          console.error('Voice chat error:', error);
        }

        this.audioChunks = [];
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      console.log('🎤 Listening... Click stop to send.');
    } catch (error) {
      console.error('Failed to start voice chat:', error);
    }
  }

  stopVoiceChat() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      console.log('🛑 Processing your message...');
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
      body: JSON.stringify({ message }),
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

ws.onmessage = event => {
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
    options: { stream: true },
  }),
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
  baseUrl: 'https://your-domain.com',
});

// Send a message
const response = await client.chat({
  message: 'Hello!',
  companionId: 'ai-hive-mind',
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
