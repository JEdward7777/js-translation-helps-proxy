# Unit Test Fix Needed for LLM Helper

## Problem
The unit tests in `tests/unit/llm-helper/llm-client.test.ts` are failing due to vitest mocking issues with the `ChatCompletionHandler` class.

## Error
```
TypeError: () => mockHandler is not a constructor
```

The mock is not being recognized as a constructor when `new ChatCompletionHandler()` is called in the LLMHelper constructor.

## Current Test File
Location: `tests/unit/llm-helper/llm-client.test.ts`

The test is trying to mock `ChatCompletionHandler` from `../../../src/openai-api/chat-completion.js` but the mock isn't working correctly.

## What Needs to Be Fixed
The vitest mock setup needs to be corrected so that:
1. `ChatCompletionHandler` can be instantiated with `new`
2. The mock returns an object with methods: `handleChatCompletion`, `getClient`, `updateConfig`
3. These methods can be spied on and have return values set

## Current Mock Attempt
```typescript
vi.mock('../../../src/openai-api/chat-completion.js');

beforeEach(() => {
  mockHandler = {
    handleChatCompletion: vi.fn(),
    getClient: vi.fn(),
    updateConfig: vi.fn(),
  };
  
  vi.mocked(ChatCompletionHandler).mockImplementation(() => mockHandler);
});
```

## Possible Solutions to Try
1. Use `vi.fn()` to create a constructor mock
2. Try different vitest mocking patterns
3. Consider using `vi.spyOn` instead
4. Check if the import path or module resolution is causing issues
5. Look at other test files in the project that successfully mock classes

## Tests That Need to Pass
- `should create helper with valid config`
- `should create helper with custom config`
- `should throw error for missing API key`
- `should throw error for missing model`
- `should call ChatCompletionHandler and return formatted response`
- `should handle response without usage`
- `should return Translation Helps client`

## Integration Tests
Note: The integration tests in `tests/integration/llm-helper/basic.test.ts` are working correctly and test the actual functionality. The unit tests are just for isolated testing of the wrapper logic.

## Test Count
Currently: 154/161 tests passing (7 failing - 5 are these unit tests, 2 are upstream server bugs)
Goal: Get all 7 unit tests passing

## Additional Context
The LLMHelper class is a thin wrapper around ChatCompletionHandler. The actual implementation works correctly, it's just the unit test mocking that needs to be fixed.