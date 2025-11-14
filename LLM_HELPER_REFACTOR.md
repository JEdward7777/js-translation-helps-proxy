# LLM Helper Refactoring Plan

## Goal
Unify Interface 3.5 (LLM Helper) and Interface 4 (OpenAI API) to share the same OpenAI integration code. This ensures that improvements to Interface 4 automatically benefit Interface 3.5.

## Current State

### Interface 4 (OpenAI API) - `src/openai-api/`
- ✅ Uses official OpenAI SDK
- ✅ Implements iterative tool calling
- ✅ Supports n > 1 and structured outputs
- ✅ Proper error handling
- ✅ Baked-in filters (language=en, organization=unfoldingWord)

### Interface 3.5 (LLM Helper) - `src/llm-helper/`
- ❌ Uses raw `fetch()` calls
- ❌ Supports both OpenAI and Anthropic (not needed)
- ❌ Duplicates OpenAI logic
- ❌ 424 lines of code

## Proposed Architecture

Make Interface 3.5 a **thin wrapper** around Interface 4's `ChatCompletionHandler`:

```
src/
├── openai-api/
│   ├── chat-completion.ts    # Core OpenAI logic (already done)
│   └── tool-mapper.ts         # Tool conversion utilities
└── llm-helper/
    ├── index.ts               # Public API (simplified)
    └── types.ts               # Type definitions (simplified)
```

## Implementation Plan

### Phase 1: Simplify LLM Helper

#### 1.1 Rewrite `src/llm-helper/index.ts`

**Current exports:**
```typescript
export { LLMHelper } from './llm-client.js';
export { ToolExecutor } from './tool-executor.js';
export * from './types.js';
```

**New implementation:**
```typescript
import { ChatCompletionHandler } from '../openai-api/chat-completion.js';
import { TranslationHelpsClient } from '../core/index.js';

export interface LLMHelperConfig {
  apiKey: string;
  model: string;
  language?: string;
  organization?: string;
  maxToolIterations?: number;
  upstreamUrl?: string;
  timeout?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: ChatMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM Helper - Simplified wrapper around OpenAI API with Translation Helps tools
 */
export class LLMHelper {
  private handler: ChatCompletionHandler;
  private apiKey: string;
  private model: string;

  constructor(config: LLMHelperConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
    if (!config.model) {
      throw new Error('Model is required');
    }

    this.apiKey = config.apiKey;
    this.model = config.model;

    // Reuse Interface 4's ChatCompletionHandler
    this.handler = new ChatCompletionHandler({
      language: config.language || 'en',
      organization: config.organization || 'unfoldingWord',
      maxToolIterations: config.maxToolIterations || 5,
      enableToolExecution: true,
      upstreamUrl: config.upstreamUrl,
      timeout: config.timeout,
    });
  }

  /**
   * Send a chat request with automatic tool execution
   */
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    // Convert to OpenAI request format
    const request = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    };

    // Use Interface 4's handler
    const response = await this.handler.handleChatCompletion(request, this.apiKey);

    // Convert response to simplified format
    return {
      message: {
        role: 'assistant',
        content: response.choices[0].message.content || '',
      },
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  }

  /**
   * Get the Translation Helps client for direct tool access
   */
  getClient(): TranslationHelpsClient {
    return this.handler.getClient();
  }
}
```

#### 1.2 Delete Obsolete Files

Remove these files as they're no longer needed:
- `src/llm-helper/llm-client.ts` (424 lines - replaced by ~80 lines above)
- `src/llm-helper/tool-executor.ts` (Interface 4 handles this)
- Most of `src/llm-helper/types.ts` (keep only simple types)

#### 1.3 Simplify `src/llm-helper/types.ts`

**Keep only:**
```typescript
// Re-export from main index
export type { LLMHelperConfig, ChatMessage, ChatResponse } from './index.js';
```

### Phase 2: Update Tests

#### 2.1 Update `tests/integration/llm-helper/basic.test.ts`

**Changes:**
- Remove Anthropic tests
- Simplify to test only OpenAI
- Update expectations to match new simpler API
- Tests should verify that LLMHelper uses Interface 4's logic

**Example:**
```typescript
import { LLMHelper } from '../../../src/llm-helper/index.js';

describe('LLM Helper (Integration)', () => {
  it('should use OpenAI SDK via Interface 4', async () => {
    const helper = new LLMHelper({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4o-mini',
    });

    const response = await helper.chat([
      { role: 'user', content: 'Say hello' }
    ]);

    expect(response.message.role).toBe('assistant');
    expect(response.message.content).toBeTruthy();
  });

  it('should execute Translation Helps tools automatically', async () => {
    const helper = new LLMHelper({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4o-mini',
    });

    const response = await helper.chat([
      { role: 'user', content: 'Fetch John 3:16' }
    ]);

    expect(response.message.content).toContain('God');
  });
});
```

#### 2.2 Update `tests/unit/llm-helper/llm-client.test.ts`

**Changes:**
- Remove Anthropic tests
- Remove fetch mocking (now uses OpenAI SDK)
- Test that LLMHelper properly wraps ChatCompletionHandler
- Test configuration passing

### Phase 3: Update Documentation

#### 3.1 Update `docs/LLM_HELPER.md`

**Changes:**
- Remove all Anthropic references
- Update to show OpenAI-only usage
- Emphasize that it uses same logic as Interface 4
- Update examples to use gpt-4o-mini

**Key sections to update:**
- Line 1-30: Overview - mention it uses Interface 4's logic
- Line 50-100: Remove Anthropic examples
- Line 150-200: Simplify API documentation
- Add note: "Interface 3.5 uses the same OpenAI integration as Interface 4, ensuring consistent behavior"

#### 3.2 Update `README.md`

**Changes:**
- Line 254-289: Update Interface 3.5 section
- Remove Anthropic mentions
- Add note about shared logic with Interface 4

**Example:**
```markdown
### Interface 3.5: TypeScript LLM Helper

Programmatic TypeScript interface for OpenAI integration with automatic tool execution.
**Uses the same OpenAI logic as Interface 4.**

```typescript
import { LLMHelper } from 'js-translation-helps-proxy/llm-helper';

const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',
});

const response = await helper.chat([
  { role: 'user', content: 'What does John 3:16 say?' }
]);
```

**Key Features:**
- ✅ **Shares logic with Interface 4**: Same OpenAI SDK integration
- ✅ **Automatic tool execution**: Translation Helps tools work automatically
- ✅ **Baked-in filters**: `language=en`, `organization=unfoldingWord`
- ✅ **Type-safe**: Full TypeScript support
```

#### 3.3 Update `docs/INDEX.md`

**Changes:**
- Line 66-85: Update Interface 3.5 description
- Remove Anthropic references
- Update comparison table

#### 3.4 Update `examples/llm-helper/`

**Changes:**
- Remove Anthropic examples
- Update all examples to use OpenAI only
- Simplify examples to match new API

### Phase 4: Update Package Exports

#### 4.1 Update `package.json`

**Verify exports:**
```json
{
  "exports": {
    "./llm-helper": {
      "import": "./dist/llm-helper/index.js",
      "types": "./dist/llm-helper/index.d.ts"
    }
  }
}
```

### Phase 5: Testing & Validation

#### 5.1 Run Tests

```bash
# Run all tests
npm test

# Specifically test LLM Helper
npm run test:integration -- tests/integration/llm-helper
npm run test:unit -- tests/unit/llm-helper
```

#### 5.2 Manual Testing

```bash
# Test with actual OpenAI API
node -e "
import { LLMHelper } from './dist/llm-helper/index.js';

const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini'
});

const response = await helper.chat([
  { role: 'user', content: 'Fetch John 3:16' }
]);

console.log(response.message.content);
"
```

## Files to Modify

### Source Code (3 files)
1. **`src/llm-helper/index.ts`** - Complete rewrite (~80 lines, down from 424)
2. **`src/llm-helper/types.ts`** - Simplify to re-exports only
3. **DELETE `src/llm-helper/llm-client.ts`** - No longer needed
4. **DELETE `src/llm-helper/tool-executor.ts`** - Interface 4 handles this

### Tests (2 files)
5. **`tests/integration/llm-helper/basic.test.ts`** - Remove Anthropic, simplify
6. **`tests/unit/llm-helper/llm-client.test.ts`** - Update for new architecture

### Documentation (4 files)
7. **`docs/LLM_HELPER.md`** - Remove Anthropic, emphasize shared logic
8. **`README.md`** - Update Interface 3.5 section
9. **`docs/INDEX.md`** - Update comparison table
10. **`examples/llm-helper/*.ts`** - Update all examples

## Benefits

### Code Quality
- ✅ **Single source of truth**: All OpenAI logic in Interface 4
- ✅ **Less code**: ~350 lines removed from LLM Helper
- ✅ **No duplication**: One OpenAI implementation
- ✅ **Easier maintenance**: Fix once, benefits both interfaces

### Functionality
- ✅ **Automatic improvements**: Fixing Interface 4 fixes Interface 3.5
- ✅ **Consistent behavior**: Both use same OpenAI SDK
- ✅ **Better error handling**: Inherits Interface 4's error handling
- ✅ **Feature parity**: n > 1, structured outputs, etc.

### Testing
- ✅ **Simpler tests**: Less mocking needed
- ✅ **Better coverage**: Testing Interface 4 covers both
- ✅ **Faster tests**: Less code to test

## Migration Guide for Users

### Before (Old API)
```typescript
import { LLMHelper } from 'js-translation-helps-proxy/llm-helper';

const helper = new LLMHelper({
  provider: 'openai',  // ❌ No longer needed
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4',
  language: 'en',
  organization: 'unfoldingWord',
});

const response = await helper.chat([
  { role: 'user', content: 'Fetch John 3:16' }
]);
```

### After (New API)
```typescript
import { LLMHelper } from 'js-translation-helps-proxy/llm-helper';

const helper = new LLMHelper({
  // provider removed - OpenAI only
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',  // Use cheaper model
  language: 'en',
  organization: 'unfoldingWord',
});

const response = await helper.chat([
  { role: 'user', content: 'Fetch John 3:16' }
]);
```

**Breaking Changes:**
- ❌ `provider` parameter removed (OpenAI only)
- ❌ Anthropic support removed
- ✅ Everything else stays the same

## Implementation Order

1. **Phase 1**: Rewrite LLM Helper code (~1 hour)
2. **Phase 2**: Update tests (~1 hour)
3. **Phase 3**: Update documentation (~30 min)
4. **Phase 4**: Verify package exports (~15 min)
5. **Phase 5**: Test and validate (~30 min)

**Total estimated time: 3-4 hours**

## Success Criteria

- [ ] All tests passing
- [ ] LLM Helper uses ChatCompletionHandler from Interface 4
- [ ] No Anthropic code remaining
- [ ] Documentation updated
- [ ] Examples working
- [ ] Code reduced by ~350 lines
- [ ] Both interfaces use official OpenAI SDK

## Notes

- This is a **breaking change** for Interface 3.5 (removes Anthropic)
- Since no one is using it yet, this is acceptable
- Future improvements to Interface 4 will automatically benefit Interface 3.5
- Simpler codebase is easier to maintain and test