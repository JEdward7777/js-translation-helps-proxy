# LLM Helper Examples

This directory contains examples demonstrating how to use the LLM Helper (Interface 5) - a drop-in replacement for the OpenAI client with Translation Helps tools.

## Examples

### 1. Basic Chat (`basic-chat.ts`)

Simple chat example showing basic usage of the LLM Helper with OpenAI-compatible interface.

```bash
OPENAI_API_KEY=your-key tsx examples/llm-helper/basic-chat.ts
```

### 2. With Tools (`with-tools.ts`)

Demonstrates automatic tool execution with Translation Helps tools.

```bash
OPENAI_API_KEY=your-key tsx examples/llm-helper/with-tools.ts
```

### 3. Multi-Turn Conversation (`multi-turn.ts`)

Shows how to maintain conversation context across multiple turns.

```bash
OPENAI_API_KEY=your-key tsx examples/llm-helper/multi-turn.ts
```

## Running Examples

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your API key:
   ```bash
   export OPENAI_API_KEY=your-openai-key
   ```

### Running with OpenAI

```bash
OPENAI_API_KEY=sk-... tsx examples/llm-helper/basic-chat.ts
```

## Example Output

### Basic Chat

```
LLM Helper initialized
Using OpenAI-compatible interface

Sending chat request...
Response: Hello! I'd be happy to help you study the Bible...
Tokens used: 150
```

### With Tools

```
LLM Helper initialized with automatic tool execution

Available tools: 6
Tools: fetch_scripture, fetch_translation_notes, ...

Sending request that will trigger tool calls...
User: "What does John 3:16 say and what are the translation notes?"

=== Final Response ===
John 3:16 says: "For God so loved the world that he gave his one and only Son..."

The translation notes explain that...

Tokens used: 450
```

## OpenAI Compatibility

The LLM Helper is a **drop-in replacement** for the OpenAI client:

```typescript
import { LLMHelper } from '../../src/llm-helper/index.js';
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

## Notes

- The LLM Helper implements the same interface as OpenAI's client
- Returns full OpenAI `ChatCompletion` responses (not simplified)
- Tools are automatically executed and results fed back to the LLM
- Supports all OpenAI parameters: `n`, `temperature`, `response_format`, etc.
- Baked-in filters apply: `language=en`, `organization=unfoldingWord`

## See Also

- [LLM Helper Documentation](../../docs/LLM_HELPER.md)
- [Main README](../../README.md)