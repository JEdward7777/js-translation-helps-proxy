# LLM Helper - TypeScript Function Interface

Interface 5 provides a TypeScript function interface for making LLM calls with MCP tools automatically integrated. **This interface uses the same OpenAI integration logic as [Interface 4](./OPENAI_API.md)**, ensuring consistent behavior and automatic improvements.

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

- **Shares Logic with Interface 4**: Uses the same OpenAI SDK integration as Interface 4
- **Automatic Tool Integration**: Translation Helps tools are automatically available to the LLM
- **Iterative Tool Execution**: Automatically executes tool calls and feeds results back to the LLM
- **Baked-in Filters**: Language and organization filters applied automatically (like Interface 4)
- **Type-Safe API**: Full TypeScript support with comprehensive type definitions
- **CloudFlare Workers Compatible**: Works in both Node.js and CloudFlare Workers environments

## Installation

```bash
npm install js-translation-helps-proxy
```

Or if using in the same project:

```typescript
import { LLMHelper } from './src/llm-helper/index.js';
```

## Quick Start

```typescript
import { LLMHelper } from 'js-translation-helps-proxy/llm-helper';

const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',
});

// Simple chat with automatic tool execution
const response = await helper.chat([
  { role: 'user', content: 'What does John 3:16 say?' }
]);

console.log(response.message.content);
```

## Configuration

### LLMHelperConfig

```typescript
interface LLMHelperConfig {
  // Required: OpenAI settings
  apiKey: string;
  model: string;
  
  // Optional: Baked-in filters (like Interface 4)
  language?: string;             // Default: 'en'
  organization?: string;         // Default: 'unfoldingWord'
  
  // Optional: Tool execution settings
  maxToolIterations?: number;    // Default: 5
  
  // Optional: Upstream settings
  upstreamUrl?: string;          // Default: 'https://translation-helps-mcp.pages.dev/api/mcp'
  timeout?: number;              // Default: 30000ms
}
```

### Example Configurations

#### Minimal Configuration

```typescript
const helper = new LLMHelper({
  apiKey: 'sk-...',
  model: 'gpt-4o-mini',
});
```

#### Full Configuration

```typescript
const helper = new LLMHelper({
  apiKey: 'sk-...',
  model: 'gpt-4o-mini',
  language: 'en',
  organization: 'unfoldingWord',
  maxToolIterations: 10,
  upstreamUrl: 'https://translation-helps-mcp.pages.dev/api/mcp',
  timeout: 60000,
});
```

## Usage

### Basic Chat

```typescript
const response = await helper.chat([
  { role: 'system', content: 'You are a Bible study assistant.' },
  { role: 'user', content: 'What does John 3:16 say?' }
]);

console.log(response.message.content);
console.log('Tokens used:', response.usage?.totalTokens);
```

### Multi-Turn Conversation

```typescript
const messages = [
  { role: 'system', content: 'You are a Bible study assistant.' },
  { role: 'user', content: 'What does John 3:16 say?' }
];

// First turn
let response = await helper.chat(messages);
messages.push(response.message);

// Second turn
messages.push({ role: 'user', content: 'What are the translation notes for this verse?' });
response = await helper.chat(messages);
messages.push(response.message);

console.log('Final response:', response.message.content);
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

### Custom Language and Organization

```typescript
const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',
  language: 'es',              // Spanish
  organization: 'custom-org',  // Custom organization
});
```

### Custom Upstream URL

```typescript
const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',
  upstreamUrl: 'http://localhost:8787/api/mcp',  // Local development
});
```

### Adjust Tool Iterations

```typescript
const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',
  maxToolIterations: 3,  // Limit to 3 iterations
});
```

## Error Handling

### Basic Error Handling

```typescript
try {
  const response = await helper.chat([
    { role: 'user', content: 'Fetch John 3:16' }
  ]);
  console.log(response.message.content);
} catch (error) {
  console.error('Error:', error.message);
}
```

### Graceful Degradation

```typescript
try {
  const response = await helper.chat([
    { role: 'user', content: 'Fetch John 3:16' }
  ]);
  return response.message.content;
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
  model: 'gpt-4o-mini',
});
```

### 2. Use gpt-4o-mini for Cost Efficiency

```typescript
const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',  // Cheaper and faster than gpt-4
});
```

### 3. Set Appropriate Timeouts

```typescript
const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',
  timeout: 60000,  // 60 seconds for tool calls
});
```

### 4. Limit Tool Iterations

```typescript
const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',
  maxToolIterations: 3,  // Prevent infinite loops
});
```

### 5. Reuse Helper Instances

```typescript
// Create once
const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',
});

// Reuse for multiple conversations
async function handleUserQuery(query: string) {
  return await helper.chat([
    { role: 'user', content: query }
  ]);
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
- `config.apiKey` (required): OpenAI API key
- `config.model` (required): OpenAI model name (e.g., 'gpt-4o-mini')
- `config.language` (optional): Language filter, default: 'en'
- `config.organization` (optional): Organization filter, default: 'unfoldingWord'
- `config.maxToolIterations` (optional): Max tool iterations, default: 5
- `config.upstreamUrl` (optional): Upstream MCP server URL
- `config.timeout` (optional): Request timeout in ms, default: 30000

#### Methods

##### chat()

```typescript
async chat(messages: ChatMessage[]): Promise<ChatResponse>
```

Send a chat request with automatic tool execution.

**Parameters:**
- `messages`: Array of chat messages with `role` and `content`

**Returns:**
- `ChatResponse` with `message` and optional `usage` information

**Example:**
```typescript
const response = await helper.chat([
  { role: 'user', content: 'What does John 3:16 say?' }
]);
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

### Types

#### ChatMessage

```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

#### ChatResponse

```typescript
interface ChatResponse {
  message: ChatMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

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

## Migration from Old API

If you were using the old LLM Helper with `provider` parameter:

### Before
```typescript
const helper = new LLMHelper({
  provider: 'openai',  // ❌ No longer needed
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4',
});
```

### After
```typescript
const helper = new LLMHelper({
  // provider removed - OpenAI only
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',  // Use newer, cheaper model
});
```

**Breaking Changes:**
- ❌ `provider` parameter removed (OpenAI only)
- ❌ Anthropic support removed
- ✅ Everything else stays the same