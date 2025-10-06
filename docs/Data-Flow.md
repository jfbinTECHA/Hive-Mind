# 🌊 Data Flow Architecture

## Overview

This document visualizes and explains the data flow patterns within AI Hive Mind, showing how information moves through the system from user input to AI response and back.

## Core Data Flows

### 1. Message Processing Flow

```mermaid
graph TD
    A[User Types Message] --> B[ChatInput Component]
    B --> C[Input Validation]
    C --> D[Message Schema Validation]
    D --> E{Valid?}

    E -->|No| F[Show Error Message]
    E -->|Yes| G[Emit message_received Event]

    G --> H[Plugin System]
    H --> I[Pre-processing Plugins]
    I --> J[Message Enhancement]

    J --> K[Context Retrieval]
    K --> L[Memory System Query]
    L --> M[Vector Similarity Search]
    M --> N[Relevant Memories Retrieved]

    N --> O[AI Engine]
    O --> P[Prompt Construction]
    P --> Q[Personality Application]
    Q --> R[API Call to LLM]

    R --> S[Response Generation]
    S --> T[Response Validation]
    T --> U[Post-processing Plugins]

    U --> V[Memory Extraction]
    V --> W[New Memories Created]
    W --> X[Vector Embeddings Generated]
    X --> Y[Memory Storage]

    Y --> Z[Response Formatting]
    Z --> AA[Voice Synthesis (Optional)]
    AA --> BB[UI Update]
    BB --> CC[Message Displayed]
```

**Key Data Transformations**:

1. **Raw Input** → **Validated Message Object**
2. **Message** → **Enhanced Context** (with memories)
3. **Context** → **AI Prompt** (structured for LLM)
4. **AI Response** → **Structured Output** (with metadata)
5. **Response** → **UI Components** (formatted for display)

### 2. Memory Formation Flow

```mermaid
graph TD
    A[Conversation Data] --> B[Message Parser]
    B --> C[Entity Extraction]
    C --> D[Fact Identification]
    D --> E[Relationship Analysis]

    E --> F[Importance Scoring]
    F --> G[Relevance Algorithm]
    G --> H[Memory Classification]

    H --> I{Should Store?}
    I -->|No| J[Discard]
    I -->|Yes| K[Memory Object Creation]

    K --> L[Content Sanitization]
    L --> M[Metadata Attachment]
    M --> N[Companion Association]

    N --> O[Embedding Generation]
    O --> P[Vector Processing]
    P --> Q[384D Vector Created]

    Q --> R[Storage Preparation]
    R --> S[IndexedDB Transaction]
    S --> T[Vector Index Update]
    T --> U[Search Index Update]

    U --> V[Memory Relationships]
    V --> W[Cross-reference Linking]
    W --> X[Knowledge Graph Update]

    X --> Y[Storage Confirmation]
    Y --> Z[Cache Invalidation]
    Z --> AA[Search Index Refresh]
```

**Data Pipeline Stages**:

1. **Extraction**: Pull facts, entities, relationships from conversation
2. **Scoring**: Determine importance and retention priority
3. **Transformation**: Convert to structured memory objects
4. **Embedding**: Generate semantic vector representations
5. **Storage**: Persist with optimized indexing
6. **Linking**: Connect to existing knowledge graph

### 3. Voice Processing Flow

```mermaid
graph TD
    A[User Speaks] --> B[Browser Microphone API]
    B --> C[Audio Stream Capture]
    C --> D[Web Audio API Processing]

    D --> E[Audio Normalization]
    E --> F[Noise Reduction]
    F --> G[Format Conversion]

    G --> H{Online Mode?}
    H -->|Yes| I[Whisper API Call]
    H -->|No| J[Local Speech Recognition]

    I --> K[OpenAI Whisper Processing]
    J --> K
    K --> L[Transcription Generated]

    L --> M[Text Post-processing]
    M --> N[Confidence Scoring]
    N --> O[Language Detection]

    O --> P[Transcription Validation]
    P --> Q{Confidence > 80%?}

    Q -->|No| R[Fallback to Manual Input]
    Q -->|Yes| S[Text Integration]
    S --> T[Chat System Input]

    T --> U[Standard Message Flow]
    U --> V[AI Response Generation]

    V --> W{Text-to-Speech Enabled?}
    W -->|No| X[Text Response Only]
    W -->|Yes| Y[ElevenLabs API Call]

    Y --> Z[Voice Synthesis]
    Z --> AA[Audio Generation]
    AA --> BB[Browser Audio Playback]
```

**Audio Data Journey**:

1. **Capture**: Raw audio from microphone
2. **Processing**: Normalization and enhancement
3. **Transcription**: Speech-to-text conversion
4. **Integration**: Text fed into chat system
5. **Synthesis**: AI response converted to speech
6. **Playback**: Audio output to user

## State Management Flow

### Application State Updates

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> MessageReceived: User Input
    MessageReceived --> Processing: Validation Pass
    Processing --> AIResponse: API Call Success
    AIResponse --> UIUpdate: Response Ready
    UIUpdate --> Idle: Display Complete

    MessageReceived --> Error: Validation Fail
    Processing --> Error: API Call Fail
    Error --> Idle: Error Handled

    Idle --> SettingsChange: User Config
    SettingsChange --> StateUpdate: Apply Changes
    StateUpdate --> Idle: Settings Saved
```

### Component Data Flow

```mermaid
graph TD
    A[App Context] --> B[ChatView Component]
    A --> C[Sidebar Component]
    A --> D[AnalyticsDashboard]

    B --> E[ChatInput Subcomponent]
    B --> F[MessageList Subcomponent]
    B --> G[EmotionalState Subcomponent]

    E --> H[VoiceSystem Integration]
    H --> I[Whisper API]
    H --> J[ElevenLabs API]

    F --> K[Message Rendering]
    K --> L[Markdown Processing]
    K --> M[Syntax Highlighting]

    G --> N[Emotion Data Fetch]
    N --> O[Real-time Updates]
```

## API Data Flow

### REST API Request/Response Cycle

```mermaid
sequenceDiagram
    participant Client
    participant Next.js
    participant API Route
    participant Business Logic
    participant Database
    participant External API

    Client->>Next.js: HTTP Request
    Next.js->>API Route: Route Handler
    API Route->>API Route: Input Validation
    API Route->>Business Logic: Process Request
    Business Logic->>Database: Data Query/Storage
    Database-->>Business Logic: Data Response
    Business Logic->>External API: Optional API Call
    External API-->>Business Logic: External Data
    Business Logic-->>API Route: Processed Result
    API Route-->>Next.js: JSON Response
    Next.js-->>Client: HTTP Response
```

### Plugin System Data Flow

```mermaid
graph TD
    A[Plugin Event] --> B[Event Emitter]
    B --> C[Plugin Registry]
    C --> D[Permission Check]
    D --> E[Plugin Sandbox]
    E --> F[Plugin Code Execution]
    F --> G[Result Validation]
    G --> H[Response Processing]
    H --> I[Main System Integration]
```

## Database Interaction Patterns

### Memory Storage Pattern

```mermaid
graph TD
    A[New Memory] --> B[Transaction Start]
    B --> C[Generate ID]
    C --> D[Create Embedding]
    D --> E[Prepare Metadata]
    E --> F[IndexedDB Store]
    F --> G[Vector Index Update]
    G --> H[Search Index Update]
    H --> I[Transaction Commit]
    I --> J[Cache Invalidation]
    J --> K[Event Emission]
```

### Query Optimization Flow

```mermaid
graph TD
    A[Search Query] --> B[Query Analysis]
    B --> C[Intent Classification]
    C --> D[Companion Filtering]
    D --> E[Time Range Filtering]

    E --> F[Vector Search]
    F --> G[Similarity Calculation]
    G --> H[Threshold Filtering]
    H --> I[Relevance Scoring]

    I --> J[Keyword Search]
    J --> K[Text Matching]
    K --> L[Result Combination]

    L --> M[Duplicate Removal]
    M --> N[Sorting by Relevance]
    N --> O[Pagination]
    O --> P[Response Formatting]
```

## Real-time Data Synchronization

### WebSocket Communication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Database
    participant Cache

    Client->>Server: WebSocket Connect
    Server->>Client: Connection Established

    Client->>Server: Subscribe to Updates
    Server->>Database: Register Listener

    Database->>Server: Data Change Event
    Server->>Cache: Update Cache
    Server->>Client: Real-time Update

    Client->>Server: Send Message
    Server->>Database: Store Message
    Database->>Server: Confirmation
    Server->>Client: Message Stored
    Server->>Client: Broadcast to Others
```

### Offline Synchronization

```mermaid
graph TD
    A[Online Mode] --> B[Real-time Sync]
    B --> C[Data Changes]
    C --> D[Immediate Persistence]
    D --> E[Live Updates]

    A --> F[Offline Mode]
    F --> G[Local Storage]
    G --> H[Change Queue]
    H --> I[Conflict Resolution]

    F --> J[Reconnection]
    J --> K[Sync Pending Changes]
    K --> L[Server Update]
    L --> M[Local Cache Update]
    M --> N[UI Synchronization]
```

## Error Handling & Recovery

### Error Propagation Flow

```mermaid
graph TD
    A[Error Occurs] --> B[Error Classification]
    B --> C{Error Type}

    C -->|Network| D[Retry Logic]
    C -->|Validation| E[User Feedback]
    C -->|Authentication| F[Re-authentication]
    C -->|System| G[Graceful Degradation]

    D --> H[Exponential Backoff]
    H --> I{Success?}
    I -->|Yes| J[Continue Normal Flow]
    I -->|No| K[Fallback Strategy]

    E --> L[Input Correction]
    F --> M[Token Refresh]
    G --> N[Reduced Functionality]
```

### Data Consistency Flow

```mermaid
graph TD
    A[Operation Start] --> B[Acquire Lock]
    B --> C[Read Current State]
    C --> D[Apply Changes]
    D --> E[Validate Consistency]
    E --> F{Valid?}

    F -->|No| G[Rollback Changes]
    F -->|Yes| H[Write to Database]
    H --> I[Update Cache]
    I --> J[Release Lock]
    J --> K[Notify Subscribers]

    G --> L[Error Handling]
    L --> M[User Notification]
```

## Performance Monitoring

### Metrics Collection Flow

```mermaid
graph TD
    A[User Action] --> B[Performance Timer Start]
    B --> C[Operation Execution]
    C --> D[Performance Timer End]
    D --> E[Metrics Calculation]

    E --> F[Response Time]
    E --> G[Memory Usage]
    E --> H[CPU Usage]
    E --> I[Error Rate]

    F --> J[Metrics Storage]
    G --> J
    H --> J
    I --> J

    J --> K[Real-time Dashboard]
    K --> L[Alert Thresholds]
    L --> M{Threshold Exceeded?}

    M -->|Yes| N[Send Alert]
    M -->|No| O[Continue Monitoring]
```

This data flow documentation provides a comprehensive view of how information moves through the AI Hive Mind system, enabling developers to understand the system's behavior and optimize performance.
