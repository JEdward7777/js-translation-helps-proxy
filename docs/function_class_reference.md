# Function and Class Reference

This document lists all functions and classes in the source code, along with where they are called from.

## core/filter-engine.ts

### FilterEngine (class)
Called from:
- src/core/index.ts (instantiated)
- tests/unit/core/filter-engine.test.ts (instantiated)
- tests/unit/core/translation-helps-client.test.ts (mocked)
- dist files (compiled)
- ARCHITECTURE.md (documentation)

### filterTools (method)
Called from:
- src/core/index.ts:70
- tests/unit/core/filter-engine.test.ts
- tests/unit/core/translation-helps-client.test.ts (mocked)
- dist files (compiled)
- ARCHITECTURE.md (documentation)

### isToolEnabled (method)
Called from:
- src/core/filter-engine.ts:20 (inside filterTools)
- src/core/index.ts:85
- tests/unit/core/filter-engine.test.ts
- tests/unit/core/translation-helps-client.test.ts (mocked)
- dist files (compiled)
- ARCHITECTURE.md (documentation)

### filterParameters (method)
Called from:
- src/core/filter-engine.ts:25 (inside filterTools)
- tests/unit/core/filter-engine.test.ts
- dist files (compiled)
- ARCHITECTURE.md (documentation)

### filterBookChapterNotes (method)
Called from:
- src/core/index.ts:107
- tests/unit/core/filter-engine.test.ts
- tests/unit/core/translation-helps-client.test.ts (mocked)
- dist files (compiled)
- ARCHITECTURE.md (documentation)

### updateConfig (method)
Called from:
- src/core/index.ts:203
- tests/unit/core/filter-engine.test.ts
- dist files (compiled)

### getConfig (method)
Called from:
- src/core/index.ts:211
- tests/unit/core/filter-engine.test.ts
- tests/unit/core/translation-helps-client.test.ts (mocked)
- tests/e2e/full-workflow.test.ts
- tests/integration/stdio-server/server.test.ts
- dist files (compiled)

## core/index.ts

### TranslationHelpsClient (class)
Called from:
- src/mcp-server/server.ts (instantiated)
- src/stdio-server/server.ts (instantiated)
- src/openai-api/chat-completion.ts (instantiated)
- tests/unit/core/translation-helps-client.test.ts (instantiated)
- tests/integration/upstream-connectivity.test.ts (instantiated)
- tests/integration/tool-calling.test.ts (instantiated)
- tests/e2e/full-workflow.test.ts (instantiated)
- examples/llm-helper/with-tools.ts (instantiated)
- dist files (compiled)
- ARCHITECTURE.md (documentation)
- docs files (documentation)

### listTools (method)
Called from:
- src/mcp-server/server.ts
- src/stdio-server/server.ts
- src/stdio-server/index.ts
- src/openai-api/routes.ts
- src/openai-api/chat-completion.ts
- src/llm-helper/index.ts (via getClient)
- tests/integration/upstream-connectivity.test.ts
- tests/integration/stdio-server/server.test.ts
- tests/e2e/full-workflow.test.ts
- tests/unit/core/translation-helps-client.test.ts
- examples/llm-helper/with-tools.ts
- dist files (compiled)
- ARCHITECTURE.md (documentation)
- docs files (documentation)

### callTool (method)
Called from:
- src/mcp-server/server.ts
- src/mcp-server/routes.ts
- src/stdio-server/server.ts
- src/openai-api/chat-completion.ts
- tests/integration/stdio-server/server.test.ts
- tests/integration/tool-calling.test.ts
- tests/unit/core/translation-helps-client.test.ts
- tests/unit/core/upstream-client.test.ts
- dist files (compiled)
- ARCHITECTURE.md (documentation)
- docs files (documentation)

### fetchScripture (method)
Called from:
- tests/integration/tool-calling.test.ts
- tests/unit/core/translation-helps-client.test.ts
- examples/llm-helper/with-tools.ts (implied via client usage)
- dist files (compiled)

### fetchTranslationNotes (method)
Called from:
- tests/integration/stdio-server/server.test.ts
- tests/integration/tool-calling.test.ts
- tests/unit/core/translation-helps-client.test.ts
- dist files (compiled)

### getSystemPrompt (method)
Called from:
- tests/unit/core/translation-helps-client.test.ts
- dist files (compiled)

### fetchTranslationQuestions (method)
Called from:
- tests/integration/tool-calling.test.ts
- tests/unit/core/translation-helps-client.test.ts
- dist files (compiled)

### getTranslationWord (method)
Called from:
- tests/integration/tool-calling.test.ts
- tests/unit/core/translation-helps-client.test.ts
- dist files (compiled)

### browseTranslationWords (method)
Called from:
- tests/integration/tool-calling.test.ts
- tests/unit/core/translation-helps-client.test.ts
- dist files (compiled)

### getContext (method)
Called from:
- tests/integration/tool-calling.test.ts
- tests/unit/core/translation-helps-client.test.ts
- dist files (compiled)

### extractReferences (method)
Called from:
- tests/integration/tool-calling.test.ts
- tests/unit/core/translation-helps-client.test.ts
- dist files (compiled)

### updateConfig (method)
Called from:
- tests/unit/core/translation-helps-client.test.ts
- tests/e2e/full-workflow.test.ts
- dist files (compiled)
- docs files (documentation)

### getConfig (method)
Called from:
- tests/unit/core/translation-helps-client.test.ts
- tests/e2e/full-workflow.test.ts
- tests/integration/stdio-server/server.test.ts
- dist files (compiled)
- docs files (documentation)

### testConnection (method)
Called from:
- tests/integration/upstream-connectivity.test.ts
- dist files (compiled)

### clearCache (method)
Called from:
- tests/e2e/full-workflow.test.ts
- dist files (compiled)
- docs files (documentation)

### getCacheStatus (method)
Called from:
- tests/e2e/full-workflow.test.ts
- tests/unit/core/translation-helps-client.test.ts
- dist files (compiled)
- docs files (documentation)

## core/response-formatter.ts

### ResponseFormatter (class)
Called from:
- src/core/index.ts (imported and used)
- tests/unit/core/translation-helps-client.test.ts (mocked)
- tests/unit/core/response-formatter.test.ts (used)
- dist files (compiled)
- ARCHITECTURE.md (documentation)

### formatResponse (static method)
Called from:
- src/core/index.ts
- tests/unit/core/translation-helps-client.test.ts (mocked)
- tests/unit/core/response-formatter.test.ts
- dist files (compiled)

### formatScripture (private static method)
Called from:
- src/core/response-formatter.ts (inside formatResponse)

### formatNotes (private static method)
Called from:
- src/core/response-formatter.ts (inside formatResponse)

### formatWords (private static method)
Called from:
- src/core/response-formatter.ts (inside formatResponse)

### formatQuestions (private static method)
Called from:
- src/core/response-formatter.ts (inside formatResponse)

### formatContext (private static method)
Called from:
- src/core/response-formatter.ts (inside formatResponse)

### formatResult (private static method)
Called from:
- src/core/response-formatter.ts (inside formatResponse)

### formatFallback (private static method)
Called from:
- src/core/response-formatter.ts (inside formatResponse)

### formatError (static method)
Called from:
- tests/unit/core/response-formatter.test.ts
- dist files (compiled)

### formatSuccess (static method)
Called from:
- tests/unit/core/response-formatter.test.ts
- dist files (compiled)

## core/tool-registry.ts

### ToolRegistry (class)
Called from:
- src/core/index.ts (instantiated)
- tests/unit/core/translation-helps-client.test.ts (mocked)
- dist files (compiled)

### getAllTools (method)
Called from:
- src/core/index.ts
- tests/unit/core/translation-helps-client.test.ts (mocked)
- dist files (compiled)

### getTool (method)
Called from:
- src/core/tool-registry.ts (inside hasTool and validateToolArgs)
- dist files (compiled)

### hasTool (method)
Called from:
- src/core/index.ts
- tests/unit/core/translation-helps-client.test.ts (mocked)
- dist files (compiled)

### getToolNames (method)
Called from:
- dist files (compiled)

### validateToolArgs (method)
Called from:
- src/core/index.ts
- tests/unit/core/translation-helps-client.test.ts (mocked)
- dist files (compiled)

### getStaticToolSchema (method)
Called from:
- dist files (compiled)

### getAllStaticSchemas (method)
Called from:
- dist files (compiled)

### clearCache (method)
Called from:
- src/core/index.ts
- tests/unit/core/translation-helps-client.test.ts (mocked)
- dist files (compiled)

### getCacheStatus (method)
Called from:
- src/core/index.ts
- tests/unit/core/translation-helps-client.test.ts (mocked)
- dist files (compiled)

## core/types.ts

### TranslationHelpsError (class)
Called from:
- src/core/types.ts (extended by other classes)
- dist files (compiled)
- docs files (documentation)

### UpstreamConnectionError (class)
Called from:
- src/core/upstream-client.ts (thrown)
- tests/unit/core/upstream-client.test.ts (expected)
- dist files (compiled)
- docs files (documentation)

### ToolNotFoundError (class)
Called from:
- src/core/index.ts (thrown)
- tests/unit/core/translation-helps-client.test.ts (expected)
- dist files (compiled)
- docs files (documentation)

### ToolDisabledError (class)
Called from:
- src/core/index.ts (thrown)
- tests/unit/core/translation-helps-client.test.ts (expected)
- dist files (compiled)
- docs files (documentation)

### InvalidArgumentsError (class)
Called from:
- src/core/index.ts (thrown)
- tests/unit/core/translation-helps-client.test.ts (expected)
- dist files (compiled)
- docs files (documentation)

### UpstreamResponseError (class)
Called from:
- src/core/upstream-client.ts (thrown)
- tests/unit/core/upstream-client.test.ts (expected)
- dist files (compiled)
- docs files (documentation)

## core/upstream-client.ts

### UpstreamClient (class)
Called from:
- src/core/index.ts (instantiated)
- src/core/tool-registry.ts (instantiated)
- tests/integration/upstream-connectivity.test.ts (instantiated)
- tests/integration/tool-calling.test.ts (instantiated)
- tests/unit/core/upstream-client.test.ts (instantiated)
- tests/unit/core/translation-helps-client.test.ts (mocked)
- dist files (compiled)
- ARCHITECTURE.md (documentation)

### listTools (method)
Called from:
- src/core/tool-registry.ts
- tests/integration/upstream-connectivity.test.ts
- tests/unit/core/upstream-client.test.ts
- dist files (compiled)

### callTool (method)
Called from:
- src/core/index.ts
- tests/integration/tool-calling.test.ts
- tests/unit/core/upstream-client.test.ts
- tests/unit/core/translation-helps-client.test.ts (mocked)
- dist files (compiled)
- ARCHITECTURE.md (documentation)

### callUpstream (private method)
Called from:
- src/core/upstream-client.ts (inside listTools and callTool)

### routeToolCall (private method)
Called from:
- src/core/upstream-client.ts (inside callUpstream)

### fetchWithTimeout (private method)
Called from:
- src/core/upstream-client.ts (inside callUpstream)

### buildQueryString (private method)
Called from:
- src/core/upstream-client.ts (inside routeToolCall)

### getHeaders (private method)
Called from:
- src/core/upstream-client.ts (inside callUpstream and routeToolCall)

### isRetryableError (private method)
Called from:
- src/core/upstream-client.ts (inside fetchWithTimeout)

### isRetryableStatus (private method)
Called from:
- src/core/upstream-client.ts (inside fetchWithTimeout and isRetryableError)

### calculateRetryDelay (private method)
Called from:
- src/core/upstream-client.ts (inside fetchWithTimeout)

### sleep (private method)
Called from:
- src/core/upstream-client.ts (inside fetchWithTimeout)
