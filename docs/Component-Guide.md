# 🧩 Component Architecture Guide

## Overview

This guide explains the component architecture of AI Hive Mind, including component relationships, data flow, and design patterns used throughout the application.

## Component Hierarchy

### Application Structure

```
AI Hive Mind App
├── Root Layout (layout.tsx)
│   ├── App Context Provider
│   ├── Theme Provider
│   └── Error Boundary
│
├── Navigation (Sidebar)
│   ├── Companion List
│   ├── Analytics Dashboard
│   ├── Plugin Manager
│   ├── Memory Panel
│   └── Settings
│
├── Main Content Area
│   ├── Chat Interface (ChatView)
│   │   ├── Message List
│   │   │   ├── Message Bubble
│   │   │   ├── Avatar Display
│   │   │   └── Typing Indicator
│   │   ├── Chat Input
│   │   │   ├── Text Input
│   │   │   ├── Voice Button
│   │   │   ├── Send Button
│   │   │   └── Voice Toggle
│   │   └── Emotional State Display
│   │
│   ├── Analytics Dashboard
│   │   ├── Metrics Cards
│   │   ├── Charts & Graphs
│   │   ├── Time Range Selector
│   │   └── Export Controls
│   │
│   ├── Memory Visualization
│   │   ├── Memory List
│   │   ├── Memory Search
│   │   ├── Relationship Map
│   │   └── Memory Details
│   │
│   ├── Plugin Manager
│   │   ├── Plugin List
│   │   ├── Plugin Installer
│   │   ├── Settings Panel
│   │   └── API Key Manager
│   │
│   └── Companion Editor
│       ├── Personality Selector
│       ├── Avatar Customizer
│       ├── Voice Settings
│       └── Relationship Config
```

## Core Components Deep Dive

### ChatView Component

**File**: `src/components/ChatView.tsx`

**Purpose**: Main chat interface managing conversation state, message display, and user interactions.

**Props**:
```typescript
interface ChatViewProps {
  companionId?: string;
  groupChatMode?: boolean;
  className?: string;
}
```

**State Management**:
```typescript
const [message, setMessage] = useState('');
const [isTyping, setIsTyping] = useState(false);
const [isListening, setIsListening] = useState(false);
const [ttsEnabled, setTtsEnabled] = useState(true);
const [voiceEnabled, setVoiceEnabled] = useState(false);
const [emotionalState, setEmotionalState] = useState(null);
```

**Key Methods**:

1. **sendMessage()**: Handles message sending with validation
2. **startVoiceInput()**: Initializes browser speech recognition
3. **generateVoice()**: Calls ElevenLabs API for voice synthesis
4. **fetchEmotionalState()**: Retrieves companion emotional state

**Child Components**:
- `MessageList`: Displays conversation history
- `ChatInput`: Handles user input (text/voice)
- `EmotionalStateDisplay`: Shows companion mood/energy
- `TypingIndicator`: Animated typing indicator

**Data Flow**:
```
User Input → ChatInput → ChatView.sendMessage() → API Call → State Update → MessageList Re-render
```

### ChatInput Component

**File**: `src/components/ChatInput.tsx`

**Purpose**: Handles all user input methods (text, voice) with accessibility and error handling.

**Props**:
```typescript
interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  voiceEnabled?: boolean;
}
```

**Features**:
- **Text Input**: Standard text input with keyboard shortcuts
- **Voice Input**: Browser Speech API integration with visual feedback
- **Voice Toggle**: Enable/disable ElevenLabs voice responses
- **Send Button**: Form submission with validation
- **Error Handling**: Graceful degradation when APIs unavailable

**Accessibility**:
- ARIA labels for screen readers
- Keyboard navigation support
- Visual feedback for voice recording state
- Error announcements for failed operations

**Integration Points**:
- `SpeechRecognition` API for voice input
- `elevenlabs.ts` for voice synthesis
- `AppContext` for global state
- Parent component for message sending

### AnalyticsDashboard Component

**File**: `src/components/AnalyticsDashboard.tsx`

**Purpose**: Comprehensive analytics interface showing usage metrics, companion performance, and system health.

**Data Sources**:
- Local storage for cached metrics
- API calls for real-time data
- IndexedDB for historical data
- WebSocket for live updates

**Chart Components**:
```typescript
// Metrics overview cards
<MetricsCard title="Total Messages" value={stats.totalMessages} trend={stats.trend} />

// Time-series charts
<LineChart data={messageData} timeRange={selectedRange} />

// Companion performance
<BarChart data={companionStats} metric="responseTime" />

// Memory usage visualization
<PieChart data={memoryStats} />
```

**Features**:
- **Time Range Selection**: 7d, 30d, 90d, 1y views
- **Real-time Updates**: Live data refresh
- **Export Functionality**: CSV/JSON export options
- **Filtering**: By companion, date range, metric type

### PluginManager Component

**File**: `src/components/PluginManager.tsx`

**Purpose**: User interface for managing plugins, including installation, configuration, and monitoring.

**Core Features**:

1. **Plugin Discovery**:
   - Browse available plugins
   - Search and filter capabilities
   - Plugin ratings and reviews

2. **Installation Workflow**:
   ```typescript
   const installPlugin = async (pluginId: string) => {
     setInstalling(true);
     try {
       const result = await pluginSystem.installPlugin(manifest, code);
       if (result.success) {
         toast.success('Plugin installed successfully');
         refreshPluginList();
       }
     } catch (error) {
       toast.error('Installation failed: ' + error.message);
     } finally {
       setInstalling(false);
     }
   };
   ```

3. **Configuration Interface**:
   - Dynamic settings forms based on plugin manifest
   - Validation and error handling
   - Real-time configuration updates

4. **API Key Management**:
   - Generate API keys for external access
   - Set permission scopes
   - Monitor usage and revoke access

**Security Considerations**:
- Plugin manifest validation
- Permission review before installation
- Sandboxed execution monitoring
- API key rotation capabilities

## Component Communication Patterns

### Props Drilling vs Context

**When to use props**:
```typescript
// Direct parent-child communication
<ChatInput
  onSendMessage={handleSendMessage}
  disabled={isTyping}
  voiceEnabled={voiceEnabled}
/>
```

**When to use Context**:
```typescript
// Global state shared across component tree
const { state, dispatch } = useApp();

dispatch({
  type: 'ADD_MESSAGE',
  payload: newMessage
});
```

### Event-Driven Communication

**Custom Hooks for Events**:
```typescript
function usePluginEvents() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const unsubscribe = pluginSystem.on('message_processed', (data) => {
      setEvents(prev => [...prev, data]);
    });

    return unsubscribe;
  }, []);

  return events;
}
```

### Component Composition

**Compound Components Pattern**:
```typescript
// MessageList compound component
function MessageList({ children, ...props }) {
  return (
    <div className="message-list" {...props}>
      {children}
    </div>
  );
}

MessageList.Message = function Message({ content, sender, timestamp }) {
  return (
    <div className="message">
      <Avatar user={sender} />
      <MessageContent content={content} />
      <MessageTimestamp timestamp={timestamp} />
    </div>
  );
};

// Usage
<MessageList>
  {messages.map(msg => (
    <MessageList.Message key={msg.id} {...msg} />
  ))}
</MessageList>
```

## State Management Patterns

### Local Component State

**Use Case**: Component-specific UI state that doesn't affect other components.

```typescript
function ChatInput() {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState(null);

  // Local state for input handling
}
```

### Global Application State

**Use Case**: Data shared across multiple components (messages, companions, settings).

```typescript
// AppContext for global state
interface AppState {
  messages: Message[];
  companions: Companion[];
  activeCompanion: string | null;
  theme: 'light' | 'dark';
  user: User | null;
}
```

### Server State

**Use Case**: Data fetched from APIs that needs caching and synchronization.

```typescript
function useCompanionData(companionId: string) {
  return useSWR(`/api/companions/${companionId}`, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true,
    dedupingInterval: 10000
  });
}
```

## Error Handling Patterns

### Error Boundaries

**Component-Level Error Handling**:
```typescript
class ChatErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to monitoring service
    errorReporting.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}
```

### API Error Handling

**Centralized Error Processing**:
```typescript
async function apiCall(endpoint: string, options: RequestInit) {
  try {
    const response = await fetch(endpoint, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      switch (response.status) {
        case 400:
          throw new ValidationError(errorData.message, errorData.details);
        case 401:
          throw new AuthenticationError('Please log in again');
        case 403:
          throw new PermissionError('Insufficient permissions');
        case 429:
          throw new RateLimitError('Too many requests');
        case 500:
          throw new ServerError('Server error, please try again');
        default:
          throw new APIError(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    return await response.json();
  } catch (error) {
    // Log error for monitoring
    console.error('API call failed:', error);

    // Re-throw for component handling
    throw error;
  }
}
```

## Performance Optimization Patterns

### Code Splitting

**Route-Based Splitting**:
```typescript
// Automatic with Next.js App Router
// app/analytics/page.tsx → analytics.[hash].js
// app/memory/page.tsx → memory.[hash].js
```

**Component-Based Splitting**:
```typescript
const HeavyChart = dynamic(() => import('../components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false // Disable server-side rendering for client-only component
});
```

### Memoization

**Component Memoization**:
```typescript
const MessageBubble = memo(function MessageBubble({ message, user }) {
  return (
    <div className="message-bubble">
      <Avatar user={user} />
      <div className="content">{message.content}</div>
    </div>
  );
});
```

**Value Memoization**:
```typescript
const filteredMessages = useMemo(() => {
  return messages.filter(msg => msg.sender === activeUser);
}, [messages, activeUser]);
```

### Virtualization

**Large List Optimization**:
```typescript
import { FixedSizeList as List } from 'react-window';

function MessageList({ messages }) {
  return (
    <List
      height={400}
      itemCount={messages.length}
      itemSize={80} // Height of each message item
    >
      {({ index, style }) => (
        <div style={style}>
          <MessageBubble message={messages[index]} />
        </div>
      )}
    </List>
  );
}
```

## Testing Patterns

### Component Testing

**Unit Tests with React Testing Library**:
```typescript
describe('ChatInput', () => {
  it('sends message on form submission', async () => {
    const mockOnSend = jest.fn();
    render(<ChatInput onSendMessage={mockOnSend} />);

    const input = screen.getByPlaceholderText('Type your message...');
    const button = screen.getByRole('button', { name: /send/i });

    await userEvent.type(input, 'Hello AI!');
    await userEvent.click(button);

    expect(mockOnSend).toHaveBeenCalledWith('Hello AI!');
  });
});
```

### Integration Testing

**API Integration Tests**:
```typescript
describe('Chat API Integration', () => {
  it('creates conversation and returns AI response', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({
        message: 'Hello!',
        companionId: 'test-companion'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.response).toBeDefined();
    expect(response.body.companion).toBeDefined();
  });
});
```

### E2E Testing

**User Journey Tests**:
```typescript
test('complete chat interaction', async ({ page }) => {
  await page.goto('/');

  // Type message
  await page.fill('[placeholder="Type your message..."]', 'Hello AI!');

  // Send message
  await page.click('[aria-label="Send message"]');

  // Wait for response
  await page.waitForSelector('.ai-message');

  // Verify response appears
  const aiResponse = await page.textContent('.ai-message');
  expect(aiResponse).toBeTruthy();
});
```

## Accessibility Patterns

### ARIA Implementation

**Semantic HTML with ARIA**:
```typescript
function AccessibleChatInput() {
  return (
    <form role="form" aria-label="Send message">
      <label htmlFor="message-input" className="sr-only">
        Type your message
      </label>
      <input
        id="message-input"
        type="text"
        aria-describedby="message-help"
        aria-invalid={hasError}
        aria-required="true"
      />
      <div id="message-help" className="sr-only">
        Press Enter to send, or use voice input button
      </div>

      <button
        type="button"
        aria-label={isListening ? 'Stop voice recording' : 'Start voice recording'}
        aria-pressed={isListening}
      >
        {isListening ? <MicOff /> : <Mic />}
      </button>

      <button
        type="submit"
        disabled={!message.trim()}
        aria-disabled={!message.trim()}
      >
        Send
      </button>
    </form>
  );
}
```

### Keyboard Navigation

**Focus Management**:
```typescript
function KeyboardNavigation() {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          setFocusedIndex(prev => Math.min(prev + 1, items.length - 1));
          break;
        case 'ArrowUp':
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          handleSelect(items[focusedIndex]);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, focusedIndex]);
}
```

This component guide provides a comprehensive understanding of how components are structured, how they communicate, and the patterns used throughout the AI Hive Mind application for maintainable, accessible, and performant user interfaces.