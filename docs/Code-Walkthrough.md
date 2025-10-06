# 🔍 Code Walkthrough Guide

## Overview

This guide provides detailed walkthroughs of key code components in AI Hive Mind, explaining implementation decisions, patterns, and how different parts of the system work together.

## Core Application Structure

### App Router Architecture

```
app/
├── layout.tsx          # Root layout with providers
├── page.tsx           # Home page
├── globals.css        # Global styles
├── api/               # API routes
│   ├── chat/route.ts              # Chat endpoint
│   ├── companions/route.ts        # Companion management
│   ├── memory/[ai_id]/route.ts    # Memory operations
│   └── plugins/route.ts           # Plugin API
└── (features)/        # Route groups
    ├── chat/          # Chat interface
    ├── memory/        # Memory visualization
    ├── analytics/     # Analytics dashboard
    └── demo/          # Demo pages
```

**Key Implementation**: App Router with nested layouts

```tsx
// app/layout.tsx - Root layout with context providers
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AppProvider>
      </body>
    </html>
  );
}
```

## State Management Deep Dive

### Context API + useReducer Pattern

**File**: `src/context/AppContext.tsx`

```typescript
// State structure
interface AppState {
  user: User | null;
  companions: Companion[];
  activeCompanion: string | null;
  messages: Message[];
  groupChatMode: boolean;
  theme: 'light' | 'dark';
}

// Action types for type safety
export enum ActionType {
  ADD_MESSAGE = 'ADD_MESSAGE',
  UPDATE_COMPANION = 'UPDATE_COMPANION',
  SET_ACTIVE_COMPANION = 'SET_ACTIVE_COMPANION',
  TOGGLE_GROUP_CHAT = 'TOGGLE_GROUP_CHAT'
}

// Reducer function
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case ActionType.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };

    case ActionType.SET_ACTIVE_COMPANION:
      return {
        ...state,
        activeCompanion: action.payload
      };

    default:
      return state;
  }
}

// Context provider
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}
```

**Why this pattern?**
- **Type Safety**: Full TypeScript support prevents runtime errors
- **Predictable Updates**: Reducer pattern ensures consistent state changes
- **Performance**: Context with selective re-rendering
- **Debugging**: Action logging for development

## Component Architecture

### ChatInput Component (Voice Integration)

**File**: `src/components/ChatInput.tsx`

```tsx
interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // Voice recognition setup
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const startVoiceInput = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Button
        type="button"
        onClick={isListening ? stopVoiceInput : startVoiceInput}
        variant="outline"
        className={isListening ? 'bg-red-500/20 border-red-500/50' : ''}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </Button>

      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message or use voice..."
        className="flex-1"
        disabled={disabled}
      />

      <Button
        type="button"
        onClick={() => setVoiceEnabled(!voiceEnabled)}
        variant="outline"
        title={voiceEnabled ? 'Disable voice responses' : 'Enable voice responses'}
      >
        {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </Button>

      <Button type="submit" disabled={!message.trim() || disabled}>
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
}
```

**Key Features**:
- **Browser Speech API**: Direct integration with Web Speech API
- **Fallback Handling**: Graceful degradation when speech recognition unavailable
- **State Management**: Local component state for voice interaction
- **Accessibility**: Proper ARIA labels and keyboard navigation

### Memory System Implementation

**File**: `src/lib/memory.ts`

```typescript
export class MemorySystem {
  private db: IDBDatabase | null = null;
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
    this.initializeDB();
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AIHiveMind', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create memories store
        const memoryStore = db.createObjectStore('memories', { keyPath: 'id' });
        memoryStore.createIndex('companionId', 'companionId', { unique: false });
        memoryStore.createIndex('type', 'type', { unique: false });
        memoryStore.createIndex('createdAt', 'createdAt', { unique: false });
        memoryStore.createIndex('importance', 'importance', { unique: false });

        // Create vector store for embeddings
        const vectorStore = db.createObjectStore('vectors', { keyPath: 'id' });
        vectorStore.createIndex('memoryId', 'memoryId', { unique: true });
      };
    });
  }

  async store(content: string, metadata: MemoryMetadata): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    // Generate embedding
    const embedding = await this.embeddingService.generateEmbedding(content);

    const memory: Memory = {
      id: generateId(),
      content,
      embedding,
      companionId: metadata.companionId,
      type: metadata.type,
      importance: metadata.importance || 0.5,
      tags: metadata.tags || [],
      createdAt: new Date(),
      metadata: metadata.additionalData || {}
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['memories', 'vectors'], 'readwrite');

      // Store memory
      const memoryRequest = transaction.objectStore('memories').add(memory);

      // Store vector separately for search optimization
      const vectorRequest = transaction.objectStore('vectors').add({
        id: memory.id,
        memoryId: memory.id,
        embedding: memory.embedding
      });

      transaction.oncomplete = () => resolve(memory.id);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async search(query: string, companionId: string, limit = 10): Promise<Memory[]> {
    if (!this.db) throw new Error('Database not initialized');

    // Generate query embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    // Get all vectors for companion
    const vectors = await this.getVectorsForCompanion(companionId);

    // Calculate similarities
    const similarities = vectors.map(vector => ({
      vector,
      similarity: this.cosineSimilarity(queryEmbedding, vector.embedding)
    }));

    // Sort by similarity and filter
    const topMatches = similarities
      .filter(item => item.similarity > 0.3) // Similarity threshold
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Fetch full memories
    const memoryIds = topMatches.map(item => item.vector.memoryId);
    return await this.getMemoriesByIds(memoryIds);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
```

**Key Implementation Details**:
- **IndexedDB**: Browser-native database for persistence
- **Vector Search**: Cosine similarity for semantic search
- **Dual Storage**: Separate stores for memories and vectors for optimization
- **Async Operations**: Promise-based API for all database operations

### Plugin System Architecture

**File**: `src/lib/pluginSystem.ts`

```typescript
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: PluginPermission[];
  hooks: PluginHook[];
  apiEndpoints: PluginAPIEndpoint[];
  settings: PluginSetting[];
}

export class PluginSystem {
  private plugins: Map<string, PluginInstance> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();

  async installPlugin(manifest: PluginManifest, code: string): Promise<PluginResult> {
    try {
      // Validate manifest
      this.validateManifest(manifest);

      // Create sandbox
      const sandbox = this.createSandbox(manifest.permissions);

      // Load and validate code
      const pluginCode = this.loadPluginCode(code, sandbox);

      // Create plugin instance
      const plugin: PluginInstance = {
        manifest,
        code: pluginCode,
        enabled: true,
        settings: this.initializeSettings(manifest.settings)
      };

      // Register hooks
      this.registerHooks(plugin);

      // Store plugin
      this.plugins.set(manifest.id, plugin);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private createSandbox(permissions: PluginPermission[]): Sandbox {
    const allowedGlobals = ['console', 'setTimeout', 'clearTimeout'];

    if (permissions.includes('network')) {
      allowedGlobals.push('fetch');
    }

    return new Proxy(globalThis, {
      get: (target, prop) => {
        if (allowedGlobals.includes(prop as string)) {
          return target[prop];
        }
        throw new Error(`Permission denied: ${prop}`);
      }
    });
  }

  async executeHook(event: string, context: any, data?: any): Promise<any[]> {
    const results: any[] = [];

    for (const [pluginId, plugin] of this.plugins) {
      if (!plugin.enabled) continue;

      try {
        const hook = plugin.manifest.hooks.find(h => h.event === event);
        if (hook && plugin.code[hook.handler]) {
          const result = await plugin.code[hook.handler](context, data);
          results.push({ pluginId, result });
        }
      } catch (error) {
        console.error(`Plugin ${pluginId} hook failed:`, error);
      }
    }

    return results;
  }

  async handleExternalAPI(request: ExternalAPIRequest): Promise<ExternalAPIResponse> {
    const plugin = this.plugins.get(request.pluginId);
    if (!plugin || !plugin.enabled) {
      throw new Error('Plugin not found or disabled');
    }

    // Check API key permissions
    this.validateAPIKey(request.apiKey, request.pluginId);

    // Find endpoint
    const endpoint = plugin.manifest.apiEndpoints.find(
      ep => ep.path === request.endpoint && ep.method === request.method
    );

    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    // Execute handler
    const result = await plugin.code[endpoint.handler](request.context, request.body);

    return {
      status: 200,
      body: JSON.stringify(result),
      headers: { 'Content-Type': 'application/json' }
    };
  }
}
```

**Security Features**:
- **Sandboxed Execution**: Plugins run in isolated environments
- **Permission System**: Granular access control
- **API Key Validation**: Secure external access
- **Error Isolation**: Plugin errors don't crash the system

## API Route Implementation

### Chat API Route

**File**: `src/app/api/chat/route.ts`

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Input validation with Zod
    const chatRequestSchema = z.object({
      message: z.string().min(1).max(1000),
      companionId: z.string().optional(),
      context: z.object({
        conversationHistory: z.array(z.any()).optional(),
        groupChat: z.boolean().optional()
      }).optional()
    });

    const validatedData = chatRequestSchema.parse(body);

    // Get companion context
    const companion = await getCompanionById(validatedData.companionId || 'default');

    // Retrieve relevant memories
    const memories = await memorySystem.search(
      validatedData.message,
      validatedData.companionId || 'default',
      5
    );

    // Build context for AI
    const context = buildAIContext({
      message: validatedData.message,
      companion,
      memories,
      conversationHistory: validatedData.context?.conversationHistory || []
    });

    // Call AI service
    const aiResponse = await aiService.generateResponse(context);

    // Extract and store new memories
    const extractedMemories = await memoryExtractionService.extractMemories(
      validatedData.message,
      aiResponse,
      validatedData.companionId || 'default'
    );

    await memorySystem.storeMultiple(extractedMemories);

    // Generate voice response if enabled
    let voiceUrl: string | undefined;
    if (companion.voiceEnabled) {
      voiceUrl = await voiceService.generateVoice(aiResponse, companion.voiceSettings);
    }

    // Return response
    return NextResponse.json({
      success: true,
      response: aiResponse,
      companion: {
        id: companion.id,
        name: companion.name,
        personality: companion.personality
      },
      memoriesUsed: memories.length,
      voiceUrl
    });

  } catch (error) {
    console.error('Chat API error:', error);

    // Error classification and appropriate response
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof AIServiceError) {
      return NextResponse.json(
        { success: false, error: 'AI service temporarily unavailable' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Error Handling Strategy**:
- **Input Validation**: Zod schemas for type safety
- **Error Classification**: Different error types get appropriate responses
- **Logging**: Comprehensive error logging for debugging
- **User-Friendly Messages**: Clear error messages without exposing internals

## Utility Functions and Helpers

### Data Validation Helpers

**File**: `src/lib/validation.ts`

```typescript
import { z } from 'zod';

// Reusable validation schemas
export const companionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  personality: z.enum(['friendly', 'professional', 'humorous', 'serious']),
  avatar: z.string().url().optional(),
  voiceEnabled: z.boolean().default(false),
  createdAt: z.date(),
  settings: z.record(z.any()).optional()
});

export const messageSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(10000),
  sender: z.string(),
  timestamp: z.date(),
  type: z.enum(['text', 'voice', 'image']).default('text'),
  metadata: z.record(z.any()).optional()
});

// Validation helper functions
export function validateCompanion(data: unknown): Companion {
  return companionSchema.parse(data);
}

export function validateMessage(data: unknown): Message {
  return messageSchema.parse(data);
}

export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}
```

### Configuration Management

**File**: `src/lib/config.ts`

```typescript
// Environment-based configuration
export const config = {
  // API Keys
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    available: !!process.env.OPENAI_API_KEY
  },

  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    available: !!process.env.ELEVENLABS_API_KEY
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || 'indexeddb',
    type: process.env.DATABASE_TYPE || 'indexeddb'
  },

  // Feature flags
  features: {
    voice: process.env.FEATURE_VOICE !== 'false',
    analytics: process.env.FEATURE_ANALYTICS !== 'false',
    plugins: process.env.FEATURE_PLUGINS !== 'false'
  },

  // Performance settings
  performance: {
    maxMemories: parseInt(process.env.MAX_MEMORIES || '1000'),
    cacheSize: parseInt(process.env.CACHE_SIZE || '100'),
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000')
  }
};

// Configuration validation
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.features.voice && !config.openai.available) {
    errors.push('Voice features enabled but OpenAI API key not provided');
  }

  if (config.database.type === 'postgresql' && !config.database.url.includes('postgresql://')) {
    errors.push('PostgreSQL database URL is not valid');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

## Testing Patterns

### Component Testing

**File**: `src/components/__tests__/ChatInput.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  const mockOnSendMessage = jest.fn();

  beforeEach(() => {
    mockOnSendMessage.mockClear();
  });

  it('renders input field and buttons', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voice input/i })).toBeInTheDocument();
  });

  it('calls onSendMessage when form is submitted', async () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    const input = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Hello AI!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith('Hello AI!');
    });

    expect(input).toHaveValue(''); // Input should be cleared
  });

  it('disables send button when input is empty', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    const submitButton = screen.getByRole('button', { name: /send/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables send button when input has content', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    const input = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Hello' } });

    expect(submitButton).toBeEnabled();
  });
});
```

### API Testing

**File**: `src/app/api/chat/__tests__/route.test.ts`

```typescript
import { POST } from '../route';
import { NextRequest } from 'next/server';

describe('/api/chat', () => {
  it('returns successful response for valid input', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello AI!',
        companionId: 'test-companion'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.response).toBeDefined();
    expect(data.companion).toBeDefined();
  });

  it('returns error for invalid input', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: '', // Empty message should fail
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid input');
  });

  it('handles AI service errors gracefully', async () => {
    // Mock AI service failure
    jest.spyOn(aiService, 'generateResponse').mockRejectedValue(new Error('Service unavailable'));

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test message'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.success).toBe(false);
    expect(data.error).toContain('unavailable');
  });
});
```

This code walkthrough provides deep insight into the implementation patterns, architectural decisions, and development practices used throughout the AI Hive Mind codebase. Each component is designed for maintainability, performance, and extensibility.