# LLM Helper - OpenAI-Compatible TypeScript Client

Interface 5 provides a **drop-in replacement for the OpenAI client** as a TypeScript class with Translation Helps tools automatically integrated. Unlike [Interface 4](./OPENAI_API.md) (HTTP/REST API), this is a direct TypeScript client with no network serialization overhead. **Both interfaces share the same OpenAI integration logic**, ensuring consistent behavior.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Advanced Features](#advanced-features)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)

## Overview

The LLM Helper provides:

- **Drop-In OpenAI Replacement**: Implements the same interface as `OpenAI.chat.completions.create()`
- **Full Response Compatibility**: Returns complete OpenAI `ChatCompletion` objects (not simplified)
- **Shares Logic with Interface 4**: Uses the same OpenAI SDK integration as Interface 4
- **Automatic Tool Integration**: Translation Helps tools are automatically available to the LLM
- **Iterative Tool Execution**: Automatically executes tool calls and feeds results back to the LLM
- **Supports All OpenAI Parameters**: Including `n > 1`, `temperature`, `response_format`, etc.
- **Baked-in Filters**: Language and organization filters applied automatically (like Interface 4)
- **Type-Safe API**: Full TypeScript support with comprehensive type definitions
- **CloudFlare Workers Compatible**: Works in both Node.js and CloudFlare Workers environments

## Installation

```bash
npm install js-translation-helps-proxy
```

### Importing Submodules

With the new exports configuration, you can import submodules cleanly:

```typescript
// Import LLM Helper
import { LLMHelper } from 'js-translation-helps-proxy/llm-helper';

// Import Core API
import { TranslationHelpsClient } from 'js-translation-helps-proxy/core';

// Import OpenAI API
import { ChatCompletionHandler } from 'js-translation-helps-proxy/openai-api';
```

Or if using in the same project:

```typescript
import { LLMHelper } from './src/llm-helper/index.js';
```

## Quick Start

```typescript
import { LLMHelper } from 'js-translation-helps-proxy/llm-helper';

// Drop-in replacement for OpenAI client
const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Use the same API as OpenAI
const response = await helper.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'What does John 3:16 say?' }]
});

console.log(response.choices[0].message.content);
```

### Interchangeability with OpenAI

```typescript
import { LLMHelper } from 'js-translation-helps-proxy/llm-helper';
import OpenAI from 'openai';

// Can use either client with the same code!
const client: OpenAI | LLMHelper = useTranslationHelps
  ? new LLMHelper({ apiKey })
  : new OpenAI({ apiKey });

// Same API works for both
const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

## Configuration

### LLMHelperConfig

```typescript
interface LLMHelperConfig {
  // Required
  apiKey: string;
  
  // Optional: OpenAI client settings
  baseURL?: string;                  // Custom API endpoint (e.g., for Grok, Azure OpenAI, local models)
  
  // Optional: Tool filtering
  enabledTools?: string[];           // Limit which tools are available
  hiddenParams?: string[];           // Hide parameters from LLM (e.g., ['language', 'organization'])
  filterBookChapterNotes?: boolean;  // Filter notes by book/chapter, default: true
  
  // Optional: Tool execution settings
  maxToolIterations?: number;        // Default: 5
  
  // Optional: Upstream settings
  upstreamUrl?: string;              // Default: 'https://translation-helps-mcp.pages.dev/api/mcp'
  timeout?: number;                  // Default: 30000ms
}
```

### Example Configurations

#### Minimal Configuration

```typescript
const helper = new LLMHelper({
  apiKey: 'sk-...',
});
```

#### Full Configuration

```typescript
const helper = new LLMHelper({
  apiKey: 'sk-...',
  baseURL: 'https://api.openai.com/v1',  // Optional: custom endpoint
  enabledTools: ['fetch_scripture', 'fetch_translation_notes'],
  hiddenParams: ['language', 'organization'],
  filterBookChapterNotes: true,
  maxToolIterations: 10,
  upstreamUrl: 'https://translation-helps-mcp.pages.dev/api/mcp',
  timeout: 60000,
});
```

#### Using Alternative LLM Providers

##### Grok (xAI)

```typescript
const helper = new LLMHelper({
  apiKey: 'xai-...',
  baseURL: 'https://api.x.ai/v1',
});

const response = await helper.chat.completions.create({
  model: 'grok-beta',
  messages: [{ role: 'user', content: 'What does John 3:16 say?' }]
});
```

##### Azure OpenAI

```typescript
const helper = new LLMHelper({
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  baseURL: 'https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT',
});
```

##### Local LLM Server (e.g., LM Studio, Ollama)

```typescript
const helper = new LLMHelper({
  apiKey: 'local',  // Many local servers don't validate the key
  baseURL: 'http://localhost:1234/v1',
});

const response = await helper.chat.completions.create({
  model: 'local-model',
  messages: [{ role: 'user', content: 'What does John 3:16 say?' }]
});
```

## Usage

### Basic Chat

```typescript
const response = await helper.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'You are a Bible study assistant.' },
    { role: 'user', content: 'What does John 3:16 say?' }
  ]
});

console.log(response.choices[0].message.content);
console.log('Tokens used:', response.usage?.total_tokens);
```

### Chat with OpenAI Parameters

```typescript
const response = await helper.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'You are a Bible study assistant.' },
    { role: 'user', content: 'What does John 3:16 say?' }
  ],
  temperature: 0.7,
  top_p: 0.9,
  response_format: { type: 'json_object' },
  n: 2  // Generate 2 completions
});

// Access all choices when n > 1
console.log('First:', response.choices[0].message.content);
console.log('Second:', response.choices[1].message.content);
```

### Multi-Turn Conversation

```typescript
import OpenAI from 'openai';

const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
  { role: 'system', content: 'You are a Bible study assistant.' },
  { role: 'user', content: 'What does John 3:16 say?' }
];

// First turn
let response = await helper.chat.completions.create({
  model: 'gpt-4o-mini',
  messages
});
messages.push(response.choices[0].message);

// Second turn
messages.push({ role: 'user', content: 'What are the translation notes for this verse?' });
response = await helper.chat.completions.create({
  model: 'gpt-4o-mini',
  messages
});
messages.push(response.choices[0].message);

console.log('Final response:', response.choices[0].message.content);
```

### Access Translation Helps Client

```typescript
// Get direct access to the Translation Helps client
const client = helper.getClient();

// Use client methods directly
const tools = await client.listTools();
const scripture = await client.fetchScripture({ reference: 'John 3:16' });
```

## Advanced Features

### Tool Filtering

Control which tools are available to the LLM:

```typescript
const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
  enabledTools: ['fetch_scripture', 'fetch_translation_notes'],  // Only these tools
  hiddenParams: ['language', 'organization'],  // Hide these params from LLM
  filterBookChapterNotes: true,  // Filter notes by book/chapter
});
```

### Custom Upstream URL

```typescript
const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
  upstreamUrl: 'http://localhost:8787/api/mcp',  // Local development
});
```

### Adjust Tool Iterations

```typescript
const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
  maxToolIterations: 3,  // Limit to 3 iterations
});
```

## Error Handling

### Basic Error Handling

```typescript
try {
  const response = await helper.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Fetch John 3:16' }]
  });
  console.log(response.choices[0].message.content);
} catch (error) {
  console.error('Error:', error.message);
}
```

### Graceful Degradation

```typescript
try {
  const response = await helper.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Fetch John 3:16' }]
  });
  return response.choices[0].message.content;
} catch (error) {
  // Fallback to a default response
  return 'Sorry, I encountered an error processing your request.';
}
```

## Best Practices

### 1. Use Environment Variables for API Keys

```typescript
const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
});
```

### 2. Use gpt-4o-mini for Cost Efficiency

```typescript
// Use gpt-4o-mini in your requests
const response = await helper.chat.completions.create({
  model: 'gpt-4o-mini',  // Cheaper and faster than gpt-4
  messages: [{ role: 'user', content: 'Hello' }]
});
```

### 3. Set Appropriate Timeouts

```typescript
const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
  timeout: 60000,  // 60 seconds for tool calls
});
```

### 4. Limit Tool Iterations

```typescript
const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
  maxToolIterations: 3,  // Prevent infinite loops
});
```

### 5. Reuse Helper Instances

```typescript
// Create once
const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Reuse for multiple conversations
async function handleUserQuery(query: string) {
  return await helper.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: query }]
  });
}
```

## API Reference

### LLMHelper Class

#### Constructor

```typescript
constructor(config: LLMHelperConfig)
```

Creates a new LLM Helper instance.

**Parameters:**
- `config.apiKey` (required): OpenAI API key (or API key for alternative provider)
- `config.baseURL` (optional): Custom API endpoint for OpenAI-compatible services (e.g., Grok, Azure OpenAI, local models)
- `config.enabledTools` (optional): Array of tool names to enable
- `config.hiddenParams` (optional): Array of parameter names to hide from LLM
- `config.filterBookChapterNotes` (optional): Filter notes by book/chapter, default: true
- `config.maxToolIterations` (optional): Max tool iterations, default: 5
- `config.upstreamUrl` (optional): Upstream MCP server URL
- `config.timeout` (optional): Request timeout in ms, default: 30000

#### Methods

##### chat.completions.create()

```typescript
async chat.completions.create(
  request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming
): Promise<OpenAI.Chat.Completions.ChatCompletion>
```

Send a chat completion request with automatic tool execution. **This method implements the same interface as OpenAI's `chat.completions.create()`**, making LLMHelper a drop-in replacement.

**Parameters:**
- `request`: OpenAI chat completion request object
  - `model` (required): Model name (e.g., 'gpt-4o-mini')
  - `messages` (required): Array of chat messages
  - `temperature?: number` - Sampling temperature (0-2)
  - `top_p?: number` - Nucleus sampling parameter (0-1)
  - `response_format?: any` - Response format (e.g., `{ type: 'json_object' }`)
  - `n?: number` - Number of completions to generate
  - All other OpenAI parameters are supported

**Returns:**
- Full OpenAI `ChatCompletion` object with:
  - `id`: Completion ID
  - `object`: 'chat.completion'
  - `created`: Unix timestamp
  - `model`: Model used
  - `choices[]`: Array of completion choices (length = n)
  - `usage`: Token usage information

**Example:**
```typescript
const response = await helper.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'What does John 3:16 say?' }],
  temperature: 0.7,
  n: 2
});

// Access first choice
console.log(response.choices[0].message.content);

// When n > 1, access all choices
response.choices.forEach((choice, i) => {
  console.log(`Choice ${i}:`, choice.message.content);
});
```

##### getClient()

```typescript
getClient(): TranslationHelpsClient
```

Get the Translation Helps client for direct tool access.

**Returns:**
- `TranslationHelpsClient` instance

**Example:**
```typescript
const client = helper.getClient();
const tools = await client.listTools();
```

### Response Format

LLMHelper returns the **full OpenAI `ChatCompletion` response**, not a simplified format:

```typescript
interface ChatCompletion {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

This ensures:
- ✅ Full compatibility with OpenAI SDK
- ✅ All choices preserved when `n > 1`
- ✅ Complete metadata (id, created, model)
- ✅ No conversion overhead

## Supported Models

The LLM Helper supports all OpenAI models:

- **gpt-4o-mini** - Recommended for most use cases (fast and cost-effective)
- **gpt-4o** - Latest GPT-4 model
- **gpt-4-turbo** - Fast GPT-4 variant
- **gpt-4** - Original GPT-4
- **gpt-3.5-turbo** - Faster, cheaper option

## Examples

See the [examples directory](../examples/llm-helper/) for complete working examples:

- `basic-chat.ts` - Simple chat example
- `with-tools.ts` - Chat with automatic tool execution
- `multi-turn.ts` - Multi-turn conversation

## Related Documentation

- **[OpenAI API Interface](./OPENAI_API.md)** - Interface 4 (shares same ChatCompletionHandler logic)
- **[MCP Server](./MCP_SERVER.md)** - Interface 2 (for web services with client-controlled filters)
- **[stdio Server](./STDIO_SERVER.md)** - Interface 3 (for desktop apps like Claude Desktop)
- [Core API Documentation](./INDEX.md)
- [Architecture Overview](../ARCHITECTURE.md)
- [Main README](../README.md)

## Migration Guide

### From Old LLMHelper API

**Old API (Simplified):**
```typescript
const helper = new LLMHelper({
  apiKey: 'sk-...',
  model: 'gpt-4o-mini',
});

const response = await helper.chat(
  [{ role: 'user', content: 'Hello' }],
  { temperature: 0.7 }
);

console.log(response.message.content);  // Simplified response
```

**New API (OpenAI-Compatible):**
```typescript
const helper = new LLMHelper({
  apiKey: 'sk-...',
  // model removed from config - specify in each request
});

const response = await helper.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello' }],
  temperature: 0.7
});

console.log(response.choices[0].message.content);  // Full OpenAI response
```

**Breaking Changes:**
- ❌ `model` removed from config (specify per request)
- ❌ `helper.chat()` method removed
- ✅ Use `helper.chat.completions.create()` instead
- ✅ Returns full OpenAI response, not simplified format
- ✅ Fixes `n > 1` bug - all choices now preserved