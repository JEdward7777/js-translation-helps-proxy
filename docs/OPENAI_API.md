# OpenAI-Compatible API (Interface 4)

The OpenAI-Compatible API provides a **proxy to OpenAI's API** with automatic Translation Helps tool injection and baked-in filters for consistent behavior.

## Overview

**Interface 4** provides an OpenAI-compatible REST API that acts as a **proxy** to OpenAI's API with:
- Automatic injection of Translation Helps tools
- Iterative tool calling with local execution
- **Baked-in filters**: `language=en`, `organization=unfoldingWord`
- Compatible with any OpenAI model (gpt-4o-mini, gpt-4, gpt-3.5-turbo, etc.)
- Runs on CloudFlare Workers

## Key Features

### OpenAI API Proxy

Interface 4 **proxies requests to OpenAI's actual API**, not a fake model:

- Uses your OpenAI API key from the `Authorization` header
- Supports any OpenAI model you have access to
- Returns real OpenAI responses
- Automatically injects Translation Helps tools into requests
- Executes tool calls locally with baked-in filters

### Baked-In Filters

Unlike Interface 2 (MCP HTTP) which allows client-controlled filters, Interface 4 has **baked-in filters** for consistency:

- **Language**: Always `en` (English)
- **Organization**: Always `unfoldingWord`
- **Filter Book/Chapter Notes**: Enabled by default

These filters are applied automatically to all tool calls and cannot be overridden by clients.

### Automatic Tool Execution

The API automatically executes tool calls in chat completions, following the iterative tool execution pattern:

1. Client sends request with OpenAI API key
2. Proxy injects Translation Helps tools
3. Forwards request to OpenAI
4. If OpenAI requests tool calls, executes them locally
5. Feeds results back to OpenAI
6. Repeats until final response or max iterations

### Support for Advanced Features

- **n > 1**: When multiple responses are requested, if any response has tool calls, the first tool call is executed
- **Structured Outputs**: Full support for `response_format` parameter
- **All OpenAI Parameters**: Temperature, max_tokens, top_p, etc.

## Configuration

### API Key (Required)

Pass your OpenAI API key in the `Authorization` header:

```bash
Authorization: Bearer sk-YOUR-OPENAI-KEY
```

The proxy uses **your API key** to call OpenAI's API on your behalf.

## Endpoints

### Chat Completions

**POST** `/v1/chat/completions`

Create a chat completion with automatic tool injection and execution.

**Request Body:**
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "user",
      "content": "Fetch scripture for John 3:16"
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
  "model": "gpt-4o-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "For God so loved the world..."
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
curl -X POST http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-YOUR-OPENAI-KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Fetch John 3:16"}
    ]
  }'
```

### List Models

**GET** `/v1/models`

List available OpenAI models (proxies to OpenAI's models endpoint).

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-4o-mini",
      "object": "model",
      "created": 1234567890,
      "owned_by": "openai"
    },
    {
      "id": "gpt-4",
      "object": "model",
      "created": 1234567890,
      "owned_by": "openai"
    },
    {
      "id": "gpt-3.5-turbo",
      "object": "model",
      "created": 1234567890,
      "owned_by": "openai"
    }
  ]
}
```

**Example with curl:**
```bash
curl -H "Authorization: Bearer sk-YOUR-OPENAI-KEY" \
  http://localhost:8787/v1/models
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
  "name": "translation-helps-openai-proxy",
  "version": "1.0.0",
  "api": "openai-compatible",
  "description": "OpenAI API proxy with automatic Translation Helps tool injection",
  "capabilities": {
    "chat_completions": true,
    "tool_calling": true,
    "streaming": false,
    "models_proxy": true
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

# Configure client to use the proxy
client = OpenAI(
    base_url="http://localhost:8787/v1",
    api_key="sk-YOUR-OPENAI-KEY"  # Your actual OpenAI API key
)

# List available models (proxied from OpenAI)
models = client.models.list()
print("Available models:", [m.id for m in models.data])

# Create chat completion with any OpenAI model
response = client.chat.completions.create(
    model="gpt-4o-mini",  # Use any OpenAI model
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
  baseURL: 'http://localhost:8787/v1',
  apiKey: 'sk-YOUR-OPENAI-KEY', // Your actual OpenAI API key
});

// Create chat completion
const completion = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'user', content: 'Fetch scripture for John 3:16' }
  ],
});

console.log(completion.choices[0].message.content);
```

### Direct HTTP Requests

```bash
# Chat completion
curl -X POST http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-YOUR-OPENAI-KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "user",
        "content": "Get translation notes for Romans 8:1"
      }
    ]
  }'

# List models
curl -H "Authorization: Bearer sk-YOUR-OPENAI-KEY" \
  http://localhost:8787/v1/models

# List tools
curl http://localhost:8787/v1/tools

# Health check
curl http://localhost:8787/health
```

### With Structured Outputs

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8787/v1",
    api_key="sk-YOUR-OPENAI-KEY"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "user", "content": "Fetch John 3:16 and format as JSON"}
    ],
    response_format={"type": "json_object"}
)
```

### With Multiple Responses (n > 1)

```python
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "user", "content": "Explain John 3:16"}
    ],
    n=3  # Request 3 different responses
)

# If any response has tool calls, the first one is executed
for choice in response.choices:
    print(f"Response {choice.index}: {choice.message.content}")
```

## Tool Execution Flow

The API follows an iterative tool execution pattern:

1. **Receive Request**: Client sends chat completion request with Authorization header
2. **Extract API Key**: Extract OpenAI API key from Authorization header
3. **Inject Tools**: Add Translation Helps tools to request
4. **Call OpenAI**: Forward request to OpenAI with client's API key and model
5. **Check for Tool Calls**: If OpenAI requests tool execution, proceed to step 6
6. **Apply Filters**: Automatically apply baked-in filters (language=en, etc.)
7. **Execute Tools**: Call tools locally via TranslationHelpsClient
8. **Feed Back Results**: Send tool results back to OpenAI
9. **Repeat**: Continue loop until final response or max iterations
10. **Return Response**: Send OpenAI's actual response to client

### Example Flow

```
User Request:
  "Fetch scripture for John 3:16"
  Authorization: Bearer sk-abc123
  Model: gpt-4o-mini

↓

Proxy Injects Tools:
  + fetch_scripture
  + fetch_translation_notes
  + fetch_translation_questions
  + ...

↓

Call OpenAI API:
  Using client's API key (sk-abc123)
  Using client's model (gpt-4o-mini)

↓

OpenAI Requests Tool Call:
  fetch_scripture(reference="John 3:16")

↓

Filters Applied:
  fetch_scripture(
    reference="John 3:16",
    language="en",              ← Baked-in
    organization="unfoldingWord" ← Baked-in
  )

↓

Tool Executed Locally:
  Result: "For God so loved the world..."

↓

Results Fed Back to OpenAI:
  Tool result added to conversation

↓

OpenAI Returns Final Response:
  "John 3:16 says: For God so loved the world..."

↓

Response Returned to Client:
  Real OpenAI response with scripture
```

## Configuration

### Environment Variables

Configure via `wrangler.toml`. Only `UPSTREAM_URL` is required; other variables have defaults:

```toml
[vars]
# REQUIRED: Upstream API endpoint
UPSTREAM_URL = "https://translation-helps-mcp.pages.dev/api/mcp"

# OPTIONAL: Override defaults (uncomment to customize)
# TIMEOUT = "30000"                     # Default: 30000ms
# OPENAI_FILTER_NOTES = "true"          # Default: true (filter book/chapter notes)
# OPENAI_MAX_ITERATIONS = "5"           # Default: 5 (max tool call iterations)
# LOG_LEVEL = "info"                    # Default: "info" (options: debug, info, warn, error)
```

**Note:** The baked-in filters (language=en, organization=unfoldingWord) are hardcoded in the tool execution logic and cannot be configured via environment variables.

### Programmatic Configuration

```typescript
import { createOpenAIRoutes } from 'js-translation-helps-proxy/openai-api';

const routes = createOpenAIRoutes({
  filterBookChapterNotes: true,      // Default: true
  maxToolIterations: 5,              // Default: 5
  enableToolExecution: true,         // Default: true
  enabledTools: ['fetch_scripture'], // Optional: limit tools
  hiddenParams: ['language'],        // Optional: hide parameters
});
```

**Note:** The `language` and `organization` filters are applied automatically during tool execution and are not configurable at the route level.

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

For detailed local development and testing instructions, see the [Deployment Guide](./DEPLOYMENT.md#local-development).

**Quick Start:**

```bash
# Start development server (Wrangler - CloudFlare Workers runtime)
npm run dev:http

# Or use Native Node.js (better for debugging)
npm run dev:node

# Server will be available at http://localhost:8787
```

**Test the endpoints:**

```bash
# Health check
curl http://localhost:8787/health

# List models (requires your OpenAI API key)
curl -H "Authorization: Bearer sk-YOUR-OPENAI-KEY" \
  http://localhost:8787/v1/models

# Chat completion
curl -X POST http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-YOUR-OPENAI-KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Fetch John 3:16"}]
  }'
```

For more details on debugging, VSCode configuration, and troubleshooting, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Comparison with Interface 2 (MCP)

| Feature | Interface 4 (OpenAI Proxy) | Interface 2 (MCP) |
|---------|---------------------------|-------------------|
| API Style | REST (OpenAI-compatible) | MCP over HTTP |
| Backend | **Proxies to OpenAI** | Direct tool execution |
| Models | **Any OpenAI model** | N/A |
| API Key | **Required (your OpenAI key)** | Not required |
| Filters | **Baked-in** (language=en) | Client-controlled |
| Tool Execution | Automatic | Manual |
| Use Case | LLM integrations | MCP clients |
| Client Libraries | OpenAI SDKs | MCP SDK |

## Best Practices

### 1. Use for LLM Integrations

Interface 4 is ideal for integrating with LLMs using OpenAI-compatible APIs:

```python
# Works with any OpenAI-compatible LLM client
client = OpenAI(
    base_url="http://your-proxy.com/v1",
    api_key="sk-YOUR-OPENAI-KEY"
)
```

### 2. Choose Cost-Effective Models

Use cheaper models like `gpt-4o-mini` or `gpt-3.5-turbo` for development and testing:

```python
response = client.chat.completions.create(
    model="gpt-4o-mini",  # Cheapest option
    messages=[{"role": "user", "content": "Fetch John 3:16"}]
)
```

### 3. Rely on Baked-In Filters

Don't try to override the baked-in filters - they ensure consistent behavior:

```typescript
// ✅ Good - filters applied automatically
await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Fetch John 3:16' }]
});

// ❌ Bad - trying to override filters (won't work)
// Filters are baked-in and cannot be changed
```

### 4. Handle Tool Results

Tool execution is automatic, but you can access results in the response:

```typescript
const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'user', content: 'Fetch scripture for John 3:16' }
  ],
});

// Tool results are in the assistant's message
console.log(response.choices[0].message.content);
```

### 5. Secure Your API Key

Never expose your OpenAI API key in client-side code:

```typescript
// ✅ Good - API key on server
const client = new OpenAI({
  baseURL: 'http://your-proxy.com/v1',
  apiKey: process.env.OPENAI_API_KEY, // From environment
});

// ❌ Bad - API key in client code
// Never hardcode API keys in frontend code
```

## Limitations

- **No Streaming**: Streaming responses not yet supported
- **Fixed Filters**: Language and organization cannot be changed per request
- **English Only**: Baked-in language filter set to English
- **Max Iterations**: Tool execution limited to 5 iterations by default
- **Requires OpenAI API Key**: You must provide your own OpenAI API key

## Error Handling

### Missing Authorization Header

```json
{
  "error": {
    "message": "Missing or invalid Authorization header. Expected: Authorization: Bearer sk-...",
    "type": "invalid_request_error"
  }
}
```

### Invalid API Key

```json
{
  "error": {
    "message": "Invalid API key",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

### Invalid Model

```json
{
  "error": {
    "message": "The model 'invalid-model' does not exist",
    "type": "invalid_request_error"
  }
}
```

## See Also

- [MCP Server Documentation](./MCP_SERVER.md) - Interface 2 with client-controlled filters
- [stdio Server Documentation](./STDIO_SERVER.md) - Interface 3 for CLI usage
- [LLM Helper Documentation](./LLM_HELPER.md) - Interface 5 for TypeScript LLM integration
- [Main README](../README.md) - Project overview