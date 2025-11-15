# How Crayon Works

Crayon is a framework for building AI chat applications with streaming responses. Here's how it works in your application:

## Architecture Overview

```
User Interface (CrayonChat)
         ↓
    Frontend API Call
         ↓
   Backend API Route (/api/chat)
         ↓
    Format Conversion (Crayon → OpenAI)
         ↓
    LLM Provider (OpenRouter)
         ↓
    Stream Conversion (OpenAI → Crayon)
         ↓
    User sees streaming response
```

## Key Components

### 1. **Frontend (`src/app/page.js`)**

```javascript
<CrayonChat processMessage={processMessage} />
```

- **CrayonChat**: Pre-built chat UI component with message input, display, and streaming support
- **processMessage**: Your custom function that defines how to send messages to your backend

### 2. **Message Processing Function**

```javascript
const processMessage = async ({ threadId, messages, abortController }) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ threadId, messages }),
    signal: abortController.signal, // Allows canceling requests
  });
  return response;
};
```

- Receives: `threadId` (conversation ID), `messages` (chat history), `abortController` (for cancellation)
- Sends messages to your backend API
- Returns streaming response

### 3. **Backend API (`src/app/api/chat/route.js`)**

The backend uses three key Crayon utilities:

#### a) **`toOpenAIMessages(messages)`**
Converts Crayon's message format to OpenAI's expected format:
```javascript
// Crayon format → OpenAI format
messages: toOpenAIMessages(messages)
```

#### b) **`templatesToResponseFormat()`**
Configures how the LLM should format responses (supports structured outputs, templates, etc.):
```javascript
response_format: templatesToResponseFormat()
```

#### c) **`fromOpenAICompletion(llmStream)`**
Converts OpenAI's streaming response back to Crayon's format:
```javascript
const responseStream = fromOpenAICompletion(llmStream);
```

### 4. **Streaming Response**

```javascript
return new NextResponse(responseStream, {
  headers: {
    "Content-Type": "text/event-stream",  // Server-Sent Events
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  },
});
```

## Data Flow Example

**User types:** "Hello, how are you?"

1. **CrayonChat** captures input and calls `processMessage`
2. **Frontend** sends to backend:
   ```json
   {
     "threadId": "abc123",
     "messages": [
       { "role": "user", "content": "Hello, how are you?" }
     ]
   }
   ```

3. **Backend** converts to OpenAI format and calls OpenRouter

4. **OpenRouter** streams response back: `"I'm doing well, thank you!"`

5. **Backend** converts stream to Crayon format

6. **Frontend** receives and displays text word-by-word (streaming effect)

## Key Benefits

✅ **Ready-to-use UI**: No need to build chat interface from scratch  
✅ **Streaming support**: Real-time response display  
✅ **Provider agnostic**: Works with OpenAI, OpenRouter, or any compatible API  
✅ **Message history**: Automatically manages conversation context  
✅ **Abort control**: Cancel in-progress requests  
✅ **Structured outputs**: Support for templates and formatted responses  

## Customization

You can customize:
- The UI styling (Tailwind CSS)
- The LLM provider (OpenAI, OpenRouter, Anthropic, etc.)
- The model used (`OPENROUTER_MODEL` env variable)
- Response formatting (via `templatesToResponseFormat()`)
- Message processing logic

That's the core of how Crayon works! It abstracts the complexity of streaming AI chat interfaces while giving you flexibility to customize the backend.