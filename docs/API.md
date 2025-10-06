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

### 👥 AI Companions

#### GET `/api/companions`
List all available AI companions.

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

#### POST `/api/companions`
Create a new AI companion.

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

#### POST `/api/memory/{companionId}`
Add or update a memory.

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

#### DELETE `/api/memory/{companionId}/{memoryId}`
Delete a specific memory.

#### POST `/api/memory/search`
Search memories across all companions using semantic similarity.

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

#### POST `/api/voice/synthesize`
Convert text to speech using ElevenLabs.

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
- Body: Audio file data

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