# Crayon Architecture - Mermaid Diagrams

## 1. Complete Flow Diagram (Sequence)

```mermaid
sequenceDiagram
    participant User
    participant CrayonChat as CrayonChat Component<br/>(Frontend UI)
    participant ProcessMsg as processMessage()<br/>(Frontend Function)
    participant API as /api/chat Route<br/>(Backend)
    participant Crayon as Crayon Utils<br/>(toOpenAIMessages)
    participant OpenRouter as OpenRouter API<br/>(LLM Provider)
    participant Stream as Crayon Utils<br/>(fromOpenAICompletion)

    User->>CrayonChat: Types message: "Hello!"
    CrayonChat->>ProcessMsg: Call with {threadId, messages, abortController}
    
    ProcessMsg->>API: POST /api/chat<br/>{threadId, messages}
    
    Note over API: Receive request
    API->>Crayon: toOpenAIMessages(messages)
    Crayon-->>API: Converted messages
    
    API->>OpenRouter: client.chat.completions.create()<br/>{model, messages, stream: true}
    
    Note over OpenRouter: Generate response
    OpenRouter-->>API: Stream chunk 1: "I'm"
    API->>Stream: fromOpenAICompletion(chunk)
    Stream-->>ProcessMsg: Crayon format chunk 1
    ProcessMsg-->>CrayonChat: Update UI
    CrayonChat-->>User: Display: "I'm"
    
    OpenRouter-->>API: Stream chunk 2: " doing"
    API->>Stream: fromOpenAICompletion(chunk)
    Stream-->>ProcessMsg: Crayon format chunk 2
    ProcessMsg-->>CrayonChat: Update UI
    CrayonChat-->>User: Display: "I'm doing"
    
    OpenRouter-->>API: Stream chunk 3: " well!"
    API->>Stream: fromOpenAICompletion(chunk)
    Stream-->>ProcessMsg: Crayon format chunk 3
    ProcessMsg-->>CrayonChat: Update UI
    CrayonChat-->>User: Display: "I'm doing well!"
    
    OpenRouter-->>API: Stream complete
    API-->>ProcessMsg: Close stream
    ProcessMsg-->>CrayonChat: Finalize message
    CrayonChat-->>User: Message complete ✓
```

## 2. Component Architecture

```mermaid
graph TB
    subgraph "Frontend (Client Side)"
        A[User Browser] --> B[CrayonChat Component]
        B --> C[processMessage Function]
        C --> D{Fetch API}
    end
    
    subgraph "Backend (Server Side)"
        D --> E[Next.js API Route<br/>/api/chat/route.js]
        E --> F[toOpenAIMessages]
        F --> G[OpenAI Client Config]
        G --> H[LLM API Call]
        H --> I[OpenRouter API]
        I --> J[fromOpenAICompletion]
        J --> K[Response Stream]
    end
    
    K --> D
    D --> C
    C --> B
    B --> A
    
    style B fill:#9cf
    style E fill:#f9c
    style I fill:#fcf
```

## 3. Data Transformation Flow

```mermaid
flowchart LR
    subgraph Input
        A1[User Input:<br/>'Hello!']
    end
    
    subgraph "Crayon Format"
        B1["messages: [{<br/>role: 'user',<br/>content: 'Hello!'<br/>}]"]
    end
    
    subgraph "OpenAI Format"
        C1["messages: [{<br/>role: 'user',<br/>content: 'Hello!'<br/>}]"]
    end
    
    subgraph "LLM Response Stream"
        D1[Chunk 1: 'I'm']
        D2[Chunk 2: ' doing']
        D3[Chunk 3: ' well!']
    end
    
    subgraph "Crayon Stream Format"
        E1[Event 1]
        E2[Event 2]
        E3[Event 3]
    end
    
    subgraph Output
        F1[UI Display:<br/>'I'm doing well!']
    end
    
    A1 --> B1
    B1 -->|toOpenAIMessages| C1
    C1 --> D1
    D1 --> D2
    D2 --> D3
    D3 -->|fromOpenAICompletion| E1
    E1 --> E2
    E2 --> E3
    E3 --> F1
```

## 4. System Architecture with Environment Config

```mermaid
graph TD
    subgraph "Environment Variables"
        ENV1[OPENROUTER_API_KEY]
        ENV2[OPENROUTER_API_BASE]
        ENV3[OPENROUTER_SITE_URL]
        ENV4[OPENROUTER_MODEL]
    end
    
    subgraph "Application Layer"
        APP[Next.js App]
        UI[CrayonChat UI]
        PROCESS[processMessage]
    end
    
    subgraph "API Layer"
        ROUTE[/api/chat Route]
        CLIENT[OpenAI Client]
    end
    
    subgraph "Crayon Utils"
        TO[toOpenAIMessages]
        FROM[fromOpenAICompletion]
        FORMAT[templatesToResponseFormat]
    end
    
    subgraph "External Services"
        OR[OpenRouter API]
        LLM[LLM Model]
    end
    
    ENV1 --> CLIENT
    ENV2 --> CLIENT
    ENV3 --> CLIENT
    ENV4 --> CLIENT
    
    UI --> PROCESS
    PROCESS --> ROUTE
    ROUTE --> TO
    ROUTE --> FORMAT
    ROUTE --> CLIENT
    
    CLIENT --> OR
    OR --> LLM
    LLM --> OR
    OR --> FROM
    FROM --> ROUTE
    ROUTE --> PROCESS
    PROCESS --> UI
    
    style ENV1 fill:#ffe6e6
    style ENV2 fill:#ffe6e6
    style ENV3 fill:#ffe6e6
    style ENV4 fill:#ffe6e6
    style UI fill:#e6f3ff
    style OR fill:#f0e6ff
```

## 5. Message Lifecycle

```mermaid
stateDiagram-v2
    [*] --> UserInput: User types message
    UserInput --> CrayonFormat: CrayonChat captures
    CrayonFormat --> APIRequest: processMessage sends
    APIRequest --> ConvertToOpenAI: toOpenAIMessages()
    ConvertToOpenAI --> LLMRequest: client.chat.completions.create()
    LLMRequest --> Streaming: OpenRouter streams response
    Streaming --> ConvertToCrayon: fromOpenAICompletion()
    ConvertToCrayon --> UpdateUI: Send to frontend
    UpdateUI --> DisplayChunk: Show partial text
    DisplayChunk --> Streaming: More chunks?
    DisplayChunk --> Complete: No more chunks
    Complete --> [*]: Message complete
```

## Key Components Explained

### Frontend Components:
- **CrayonChat**: Pre-built UI component from `@crayonai/react-ui`
- **processMessage**: Custom function that bridges UI and API

### Backend Components:
- **API Route**: Next.js server endpoint (`/api/chat/route.js`)
- **OpenAI Client**: Configured for OpenRouter
- **Crayon Utils**: 
  - `toOpenAIMessages`: Format converter (Crayon → OpenAI)
  - `fromOpenAICompletion`: Stream converter (OpenAI → Crayon)
  - `templatesToResponseFormat`: Response structure config

### External Services:
- **OpenRouter**: LLM provider proxy
- **LLM Model**: Actual AI model (e.g., `kwaipilot/kat-coder-pro:free`)

These diagrams show the complete flow of how Crayon orchestrates the chat experience!