# LLM Helper Examples

This directory contains examples demonstrating how to use the LLM Helper (Interface 5).

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
   ```

### Running with OpenAI

```bash
OPENAI_API_KEY=sk-... tsx examples/llm-helper/basic-chat.ts
```

## Example Output

### Basic Chat

```
LLM Helper initialized
Model: gpt-4o-mini

Sending chat request...
Response: Hello! I'd be happy to help you study the Bible...
Tokens used: 150
```

### With Tools

```
LLM Helper initialized with automatic tool execution

Sending request that will trigger tool calls...
User: "What does John 3:16 say and what are the translation notes?"

🔧 Tool execution in progress...

=== Final Response ===
John 3:16 says: "For God so loved the world that he gave his one and only Son..."

The translation notes explain that...

Tokens used: 450
```

## Notes

- The LLM Helper uses the same OpenAI integration as Interface 4
- Tools are automatically executed and results fed back to the LLM
- Baked-in filters apply: `language=en`, `organization=unfoldingWord`

## See Also

- [LLM Helper Documentation](../../docs/LLM_HELPER.md)
- [Main README](../../README.md)