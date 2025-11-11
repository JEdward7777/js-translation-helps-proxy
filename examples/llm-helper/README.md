# LLM Helper Examples

This directory contains examples demonstrating how to use the LLM Helper (Interface 3.5).

## Examples

### 1. Basic Chat (`basic-chat.ts`)

Simple chat example showing basic usage of the LLM Helper.

```bash
OPENAI_API_KEY=your-key tsx examples/llm-helper/basic-chat.ts
```

### 2. With Tools (`with-tools.ts`)

Demonstrates automatic tool execution with callbacks for monitoring.

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
   # or
   export ANTHROPIC_API_KEY=your-anthropic-key
   ```

### Using OpenAI

```bash
OPENAI_API_KEY=sk-... tsx examples/llm-helper/basic-chat.ts
```

### Using Anthropic

Modify the example to use Anthropic:

```typescript
const helper = new LLMHelper({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-opus-20240229',
  language: 'en',
  organization: 'unfoldingWord',
});
```

Then run:

```bash
ANTHROPIC_API_KEY=sk-ant-... tsx examples/llm-helper/basic-chat.ts
```

## Example Output

### Basic Chat

```
LLM Helper initialized
Provider: openai
Model: gpt-4

Sending chat request...
Response: Hello! I'd be happy to help you study the Bible...
Finish reason: stop
Tokens used: 150
```

### With Tools

```
LLM Helper initialized with automatic tool execution

Available tools: 12
Tools: fetch_scripture, fetch_translation_notes, ...

Sending request that will trigger tool calls...
User: "What does John 3:16 say and what are the translation notes?"

🔧 Calling tool: fetch_scripture
   Arguments: {
     "reference": "John 3:16"
   }
✅ Tool result: fetch_scripture
   Content preview: For God so loved the world that he gave his one and only Son...

🔧 Calling tool: fetch_translation_notes
   Arguments: {
     "reference": "John 3:16"
   }
✅ Tool result: fetch_translation_notes
   Content preview: Translation Notes for John 3:16:

1. "For God so loved the world"...

=== Final Response ===
John 3:16 says: "For God so loved the world that he gave his one and only Son..."

The translation notes explain that...

Finish reason: stop
Tokens used: 450
```

## See Also

- [LLM Helper Documentation](../../docs/LLM_HELPER.md)
- [Main README](../../README.md)