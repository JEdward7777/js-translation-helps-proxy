# OpenAI-Compatible API (Interface 4)

The OpenAI-Compatible API provides a familiar REST interface for accessing Translation Helps tools, with automatic tool execution and baked-in filters for consistent behavior.

## Overview

**Interface 4** provides an OpenAI-compatible REST API with:
- `/v1/chat/completions` endpoint for chat-based interactions
- Automatic tool calling and execution
- **Baked-in filters**: `language=en`, `organization=unfoldingWord`, filter book/chapter notes
- Compatible with OpenAI client libraries
- Runs on CloudFlare Workers

## Key Features

### Baked-In Filters

Unlike Interface 2 (MCP SSE/HTTP) which allows client-controlled filters, Interface 4 has **baked-in filters** for consistency:

- **Language**: Always `en` (English)
- **Organization**: Always `unfoldingWord`
- **Filter Book/Chapter Notes**: Enabled by default

These filters are applied automatically to all tool calls and cannot be overridden by clients.

### Automatic Tool Execution

The API automatically executes tool calls in chat completions, following the iterative tool execution pattern from MCP-Bridge.

## Endpoints

### Chat Completions

**POST** `/v1/chat/completions`

Create a chat completion with automatic tool execution.

**Request Body:**
```json
{
  "model": "translation-helps-proxy",
  "messages": [
    {
      "role": "user",
      "content": "Fetch scripture for John 3:16"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "fetch_scripture",
        "description": "Fetch Bible scripture text",
        "parameters": {
          "type": "object",
          "properties": {
            "reference": {
              "type": "string",
              "description": "Bible reference"
            }
          },
          "required": ["reference"]
        }
      }
    }
  ]
}
```

**Response:**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "translation-helps-proxy",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Tool execution completed..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 20,
    "total_tokens": 70
  }
}
```

**Example with curl:**
```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "translation-helps-proxy",
    "messages": [
      {"role": "user", "content": "Fetch John 3:16"}
    ]
  }'
```

### List Models

**GET** `/v1/models`

List available models (returns the proxy as a model).

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "translation-helps-proxy",
      "object": "model",
      "created": 1234567890,
      "owned_by": "translation-helps"
    }
  ]
}
```

### List Tools

**GET** `/v1/tools`

List available translation helps tools in OpenAI format.

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "type": "function",
      "function": {
        "name": "fetch_scripture",
        "description": "Fetch Bible scripture text",
        "parameters": {
          "type": "object",
          "properties": {
            "reference": {
              "type": "string",
              "description": "Bible reference"
            }
          },
          "required": ["reference"]
        }
      }
    }
  ]
}
```

### Health Check

**GET** `/health`

Check API health and configuration.

**Response:**
```json
{
  "status": "healthy",
  "upstreamConnected": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "config": {
    "language": "en",
    "organization": "unfoldingWord",
    "filterBookChapterNotes": true
  }
}
```

### API Info

**GET** `/v1/info`

Get API information and capabilities.

**Response:**
```json
{
  "name": "translation-helps-openai-bridge",
  "version": "1.0.0",
  "api": "openai-compatible",
  "capabilities": {
    "chat_completions": true,
    "tool_calling": true,
    "streaming": false
  },
  "config": {
    "language": "en",
    "organization": "unfoldingWord",
    "filterBookChapterNotes": true,
    "maxToolIterations": 5
  }
}
```

## Usage Examples

### Using OpenAI Python Client

```python
from openai import OpenAI

# Configure client to use your proxy
client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="not-needed"  # API key not required for proxy
)

# List available tools
response = client.get("/tools")
print("Available tools:", response.json())

# Create chat completion
response = client.chat.completions.create(
    model="translation-helps-proxy",
    messages=[
        {"role": "user", "content": "Fetch scripture for John 3:16"}
    ]
)

print(response.choices[0].message.content)
```

### Using OpenAI Node.js Client

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:8000/v1',
  apiKey: 'not-needed', // API key not required
});

// Create chat completion
const completion = await client.chat.completions.create({
  model: 'translation-helps-proxy',
  messages: [
    { role: 'user', content: 'Fetch scripture for John 3:16' }
  ],
});

console.log(completion.choices[0].message.content);
```

### Direct HTTP Requests

```bash
# Chat completion
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "translation-helps-proxy",
    "messages": [
      {
        "role": "user",
        "content": "Get translation notes for Romans 8:1"
      }
    ]
  }'

# List tools
curl http://localhost:8000/v1/tools

# Health check
curl http://localhost:8000/health
```

## Tool Execution Flow

The API follows an iterative tool execution pattern:

1. **Receive Request**: Client sends chat completion request
2. **Extract Tool Calls**: Parse any tool calls from messages
3. **Apply Filters**: Automatically apply baked-in filters (language=en, etc.)
4. **Execute Tools**: Call tools via TranslationHelpsClient
5. **Format Results**: Convert results to OpenAI tool message format
6. **Return Response**: Send completion with tool results

### Example Flow

```
User Request:
  "Fetch scripture for John 3:16"

↓

Tool Call Detected:
  fetch_scripture(reference="John 3:16")

↓

Filters Applied:
  fetch_scripture(
    reference="John 3:16",
    language="en",              ← Baked-in
    organization="unfoldingWord" ← Baked-in
  )

↓

Tool Executed:
  Result: "For God so loved the world..."

↓

Response Returned:
  Assistant message with scripture text
```

## Configuration

### Environment Variables

Configure via `wrangler.toml`:

```toml
[vars]
# Upstream API
UPSTREAM_URL = "https://translation-helps-mcp.pages.dev/api/mcp"
TIMEOUT = "30000"

# OpenAI API baked-in filters
OPENAI_LANGUAGE = "en"
OPENAI_ORGANIZATION = "unfoldingWord"
OPENAI_FILTER_NOTES = "true"
OPENAI_MAX_ITERATIONS = "5"

# Logging
LOG_LEVEL = "info"
```

### Programmatic Configuration

```typescript
import { createOpenAIRoutes } from 'js-translation-helps-proxy/openai-api';

const routes = createOpenAIRoutes({
  language: 'en',
  organization: 'unfoldingWord',
  filterBookChapterNotes: true,
  maxToolIterations: 5,
  enableToolExecution: true,
});
```

## Deployment

### CloudFlare Workers

```bash
# Build the project
npm run build

# Deploy to CloudFlare Workers
npm run deploy

# Deploy to production
npm run deploy:production
```

### Local Development

```bash
# Start development server
npm run dev:http

# Server will be available at http://localhost:8787
```

## Comparison with Interface 2 (MCP)

| Feature | Interface 4 (OpenAI) | Interface 2 (MCP) |
|---------|---------------------|-------------------|
| API Style | REST (OpenAI-compatible) | MCP over HTTP/SSE |
| Filters | **Baked-in** (language=en) | Client-controlled |
| Tool Execution | Automatic | Manual |
| Use Case | LLM integrations | MCP clients |
| Client Libraries | OpenAI SDKs | MCP SDK |

## Best Practices

### 1. Use for LLM Integrations

Interface 4 is ideal for integrating with LLMs that support OpenAI-compatible APIs:

```python
# Works with any OpenAI-compatible LLM
client = OpenAI(base_url="http://your-proxy.com/v1")
```

### 2. Rely on Baked-In Filters

Don't try to override the baked-in filters - they ensure consistent behavior:

```typescript
// ✅ Good - filters applied automatically
await client.chat.completions.create({
  messages: [{ role: 'user', content: 'Fetch John 3:16' }]
});

// ❌ Bad - trying to override filters (won't work)
// Filters are baked-in and cannot be changed
```

### 3. Handle Tool Results

Tool execution is automatic, but you can access results in the response:

```typescript
const response = await client.chat.completions.create({
  model: 'translation-helps-proxy',
  messages: [
    { role: 'user', content: 'Fetch scripture for John 3:16' }
  ],
});

// Tool results are in the assistant's message
console.log(response.choices[0].message.content);
```

## Limitations

- **No Streaming**: Streaming responses not yet supported
- **Fixed Filters**: Language and organization cannot be changed per request
- **English Only**: Baked-in language filter set to English
- **Max Iterations**: Tool execution limited to 5 iterations by default

## See Also

- [MCP Server Documentation](./MCP_SERVER.md) - Interface 2 with client-controlled filters
- [stdio Server Documentation](./STDIO_SERVER.md) - Interface 3 for CLI usage
- [Main README](../README.md) - Project overview