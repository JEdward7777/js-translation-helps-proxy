# LLM Helper - TypeScript Function Interface

Interface 3.5 provides a TypeScript function interface for making LLM calls with MCP tools automatically integrated. This is a programmatic API similar to Interface 4 (OpenAI API) but as a TypeScript library instead of REST endpoints.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Advanced Features](#advanced-features)
- [Provider-Specific Notes](#provider-specific-notes)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)

## Overview

The LLM Helper provides:

- **Automatic Tool Integration**: Translation Helps tools are automatically available to the LLM
- **Iterative Tool Execution**: Automatically executes tool calls and feeds results back to the LLM
- **Multi-Provider Support**: Works with both OpenAI and Anthropic APIs
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

### OpenAI Example

```typescript
import { LLMHelper } from 'js-translation-helps-proxy/llm-helper';

const helper = new LLMHelper({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4',
  language: 'en',
  organization: 'unfoldingWord',
});

// Simple chat
const response = await helper.chat([
  { role: 'user', content: 'What does John 3:16 say?' }
]);

console.log(response.message.content);
```

### Anthropic Example

```typescript
import { LLMHelper } from 'js-translation-helps-proxy/llm-helper';

const helper = new LLMHelper({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-opus-20240229',
  language: 'en',
  organization: 'unfoldingWord',
});

const response = await helper.chat([
  { role: 'user', content: 'Fetch translation notes for Romans 8:1' }
]);

console.log(response.message.content);
```

## Configuration

### LLMHelperConfig

```typescript
interface LLMHelperConfig {
  // Required: LLM Provider settings
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model: string;
  
  // Optional: Provider settings
  baseURL?: string;              // Custom API endpoint
  timeout?: number;              // Request timeout (default: 60000ms)
  
  // Optional: Translation Helps settings
  translationHelpsConfig?: {
    upstreamUrl?: string;        // Default: 'https://translation-helps-mcp.pages.dev/api/mcp'
    timeout?: number;            // Default: 30000ms
    filterBookChapterNotes?: boolean;  // Default: true
    enabledTools?: string[];     // Filter to specific tools
    hiddenParams?: string[];     // Hide specific parameters
  };
  
  // Optional: Tool execution settings
  maxToolIterations?: number;    // Default: 5
  enableToolExecution?: boolean; // Default: true
  
  // Optional: Baked-in filters (like Interface 4)
  language?: string;             // Default: 'en'
  organization?: string;         // Default: 'unfoldingWord'
  
  // Optional: LLM settings
  temperature?: number;
  maxTokens?: number;
}
```

### Example Configurations

#### Minimal Configuration

```typescript
const helper = new LLMHelper({
  provider: 'openai',
  apiKey: 'sk-...',
  model: 'gpt-4',
});
```

#### Full Configuration

```typescript
const helper = new LLMHelper({
  provider: 'anthropic',
  apiKey: 'sk-ant-...',
  model: 'claude-3-opus-20240229',
  baseURL: 'https://api.anthropic.com',
  timeout: 120000,
  
  translationHelpsConfig: {
    upstreamUrl: 'https://translation-helps-mcp.pages.dev/api/mcp',
    timeout: 30000,
    filterBookChapterNotes: true,
    enabledTools: ['fetch_scripture', 'fetch_translation_notes'],
  },
  
  maxToolIterations: 10,
  enableToolExecution: true,
  language: 'en',
  organization: 'unfoldingWord',
  temperature: 0.7,
  maxTokens: 4096,
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
console.log('Finish reason:', response.finishReason);
console.log('Tokens used:', response.usage?.totalTokens);
```

### Chat with Tool Execution Callbacks

```typescript
const response = await helper.chat(
  [
    { role: 'user', content: 'Fetch scripture and notes for John 3:16' }
  ],
  {
    maxIterations: 5,
    onToolCall: (toolCall) => {
      console.log(`Calling tool: ${toolCall.name}`, toolCall.arguments);
    },
    onToolResult: (result) => {
      console.log(`Tool result: ${result.name}`, result.content.substring(0, 100));
    },
    onIteration: (iteration, max) => {
      console.log(`Iteration ${iteration}/${max}`);
    },
  }
);
```

### Manual Tool Execution

```typescript
// Execute a tool directly without LLM
const scripture = await helper.executeTool('fetch_scripture', {
  reference: 'John 3:16',
});

console.log(scripture);
```

### Get Available Tools

```typescript
const tools = await helper.getAvailableTools();

tools.forEach(tool => {
  console.log(`${tool.name}: ${tool.description}`);
});
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

## Advanced Features

### Disable Automatic Tool Execution

```typescript
const helper = new LLMHelper({
  provider: 'openai',
  apiKey: 'sk-...',
  model: 'gpt-4',
  enableToolExecution: false,  // Tools available but not auto-executed
});

const response = await helper.chat([
  { role: 'user', content: 'What tools do you have?' }
]);

// LLM can see tools but won't execute them automatically
```

### Update Configuration Dynamically

```typescript
const helper = new LLMHelper({
  provider: 'openai',
  apiKey: 'sk-...',
  model: 'gpt-4',
  language: 'en',
});

// Later, switch to Spanish
helper.updateConfig({ language: 'es' });

// Now all tool calls will use Spanish
const response = await helper.chat([
  { role: 'user', content: 'Fetch John 3:16' }
]);
```

### Custom Upstream URL

```typescript
const helper = new LLMHelper({
  provider: 'openai',
  apiKey: 'sk-...',
  model: 'gpt-4',
  translationHelpsConfig: {
    upstreamUrl: 'http://localhost:8787/api/mcp',  // Local development
  },
});
```

### Filter Available Tools

```typescript
const helper = new LLMHelper({
  provider: 'openai',
  apiKey: 'sk-...',
  model: 'gpt-4',
  translationHelpsConfig: {
    enabledTools: [
      'fetch_scripture',
      'fetch_translation_notes',
      'fetch_translation_questions',
    ],
  },
});
```

## Provider-Specific Notes

### OpenAI

- **Supported Models**: `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`, etc.
- **Tool Format**: Uses OpenAI's function calling format
- **System Messages**: Supported natively
- **Default Base URL**: `https://api.openai.com`

```typescript
const helper = new LLMHelper({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4-turbo-preview',
  temperature: 0.7,
  maxTokens: 4096,
});
```

### Anthropic

- **Supported Models**: `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`
- **Tool Format**: Uses Anthropic's tool use format
- **System Messages**: Converted to system parameter
- **Default Base URL**: `https://api.anthropic.com`
- **Note**: `maxTokens` is required for Anthropic (defaults to 4096)

```typescript
const helper = new LLMHelper({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-opus-20240229',
  temperature: 0.7,
  maxTokens: 4096,  // Required for Anthropic
});
```

## Error Handling

### Error Types

```typescript
import {
  LLMHelperError,
  LLMProviderError,
  ToolExecutionError,
  MaxIterationsError,
  InvalidConfigError,
} from 'js-translation-helps-proxy/llm-helper';
```

### Handling Errors

```typescript
try {
  const response = await helper.chat([
    { role: 'user', content: 'Fetch John 3:16' }
  ]);
} catch (error) {
  if (error instanceof LLMProviderError) {
    console.error('LLM API error:', error.message, error.statusCode);
  } else if (error instanceof ToolExecutionError) {
    console.error('Tool execution failed:', error.message, error.toolName);
  } else if (error instanceof MaxIterationsError) {
    console.error('Max iterations reached:', error.message);
  } else if (error instanceof InvalidConfigError) {
    console.error('Invalid configuration:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Graceful Degradation

```typescript
const response = await helper.chat(
  [{ role: 'user', content: 'Fetch John 3:16' }],
  {
    onToolResult: (result) => {
      if (result.isError) {
        console.warn(`Tool ${result.name} failed:`, result.content);
        // Continue anyway - LLM will see the error
      }
    },
  }
);
```

## Best Practices

### 1. Use Environment Variables for API Keys

```typescript
const helper = new LLMHelper({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4',
});
```

### 2. Set Appropriate Timeouts

```typescript
const helper = new LLMHelper({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4',
  timeout: 120000,  // 2 minutes for complex requests
  translationHelpsConfig: {
    timeout: 30000,  // 30 seconds for tool calls
  },
});
```

### 3. Limit Tool Iterations

```typescript
const helper = new LLMHelper({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4',
  maxToolIterations: 3,  // Prevent infinite loops
});
```

### 4. Use Callbacks for Monitoring

```typescript
const response = await helper.chat(messages, {
  onToolCall: (toolCall) => {
    logger.info(`Tool called: ${toolCall.name}`);
  },
  onToolResult: (result) => {
    logger.info(`Tool completed: ${result.name}`);
  },
});
```

### 5. Handle Errors Gracefully

```typescript
try {
  const response = await helper.chat(messages);
  return response.message.content;
} catch (error) {
  if (error instanceof MaxIterationsError) {
    return 'The request took too many steps. Please try a simpler query.';
  }
  throw error;
}
```

### 6. Reuse Helper Instances

```typescript
// Create once
const helper = new LLMHelper({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4',
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

#### Methods

##### chat()

```typescript
async chat(
  messages: ChatMessage[],
  options?: ToolExecutionOptions
): Promise<ChatResponse>
```

Main method for chat with automatic tool execution.

##### getAvailableTools()

```typescript
async getAvailableTools(): Promise<Tool[]>
```

Get list of available MCP tools.

##### executeTool()

```typescript
async executeTool(name: string, args: Record<string, any>): Promise<string>
```

Execute a single tool manually.

##### getProvider()

```typescript
getProvider(): string
```

Get the LLM provider name.

##### getModel()

```typescript
getModel(): string
```

Get the LLM model name.

##### getConfig()

```typescript
getConfig(): Readonly<Required<LLMHelperConfig>>
```

Get the current configuration.

##### updateConfig()

```typescript
updateConfig(config: Partial<LLMHelperConfig>): void
```

Update configuration dynamically.

### Types

See [types.ts](../src/llm-helper/types.ts) for complete type definitions.

## Examples

See the [examples directory](../examples/llm-helper/) for complete working examples:

- `basic-chat.ts` - Simple chat example
- `with-tools.ts` - Chat with automatic tool execution
- `multi-turn.ts` - Multi-turn conversation

## Related Documentation

- [Core API Documentation](./CORE_API.md)
- [OpenAI API Interface](./OPENAI_API.md)
- [Architecture Overview](../ARCHITECTURE.md)
- [Main README](../README.md)