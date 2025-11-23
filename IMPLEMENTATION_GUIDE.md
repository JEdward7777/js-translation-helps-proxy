# Implementation Guide: Upstream MCP Adaptation

**Version:** 0.1.0 → 0.2.0  
**Date:** 2025-11-23  
**Status:** Ready for Implementation  
**Estimated Effort:** 4-6 hours

---

## Executive Summary

The upstream translation-helps-mcp service has been updated to be fully MCP-compliant. This allows us to dramatically simplify our codebase by:

1. **Removing custom REST endpoint routing** (~90 lines) → Use pure MCP passthrough
2. **Removing hardcoded tool schemas** (~250 lines) → Use dynamic discovery
3. **Removing convenience methods** (~50 lines) → Use generic `callTool()`
4. **Removing tool-specific validation** (~25 lines) → Use schema-based validation

**Total code reduction:** ~415 lines (8% of codebase)

**Key principle:** Be a transparent MCP proxy with optional filtering, not a reimplementation of MCP protocol.

---

## Upstream Verification

✅ **Verified via live testing:**
- MCP protocol works at `https://translation-helps-mcp.pages.dev/api/mcp`
- `tools/list` returns 11 tools with complete schemas
- `tools/call` executes all tools correctly
- Response format is proper MCP TextContent
- Performance is excellent (~1.5s with caching)

---

## Changes Required

### 1. Update Routing to Pure MCP Passthrough

**File:** `src/core/upstream-client.ts`  
**Lines:** 149-240 (replace entire `routeToolCall()` method)

**Current code (149 lines with switch statement):**
```typescript
private routeToolCall(toolName: string, args: Record<string, any>) {
  const baseUrl = this.config.upstreamUrl.replace('/api/mcp', '');
  
  switch (toolName) {
    case 'fetch_scripture':
      return { url: `${baseUrl}/api/fetch-scripture?...`, ... };
    case 'fetch_translation_notes':
      return { url: `${baseUrl}/api/translation-notes?...`, ... };
    // ... 7 more cases
    default:
      return { url: this.config.upstreamUrl, ... };
  }
}
```

**New code (10 lines, tool-agnostic):**
```typescript
private routeToolCall(toolName: string, args: Record<string, any>): { url: string; options: RequestInit } {
  // Pure MCP passthrough - works for ANY tool
  return {
    url: this.config.upstreamUrl,
    options: {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      })
    }
  };
}
```

**Why this works:**
- Upstream handles all tools via MCP protocol
- No need to know individual REST endpoints
- Works for current and future tools automatically
- Maintains existing retry logic with exponential backoff

**Important:** Keep the existing `fetchWithTimeout()` method - it already has retry logic with exponential backoff that we need to preserve.

---

### 2. Remove Hardcoded Tool Schemas

**File:** `src/core/types.ts`  
**Lines:** 12-250 (remove all tool schema exports)

**Remove these exports:**
```typescript
export const fetchScriptureSchema = { ... };
export const fetchTranslationNotesSchema = { ... };
export const getSystemPromptSchema = { ... };
export const fetchTranslationQuestionsSchema = { ... };
export const getTranslationWordSchema = { ... };
export const browseTranslationWordsSchema = { ... };
export const getContextSchema = { ... };
export const extractReferencesSchema = { ... };
export const fetchResourcesSchema = { ... };
export const getWordsForReferenceSchema = { ... };
export const searchResourcesSchema = { ... };
export const getLanguagesSchema = { ... };
```

**Keep:**
- Type definitions (`Tool`, `ToolSchema`, `ToolArguments`, etc.)
- Interface definitions
- Error types

**Exception handling:** If a specific tool is broken upstream and needs patching, add ONLY that tool's schema with a comment explaining why:
```typescript
// PATCH: Override broken upstream schema for tool_name
// Remove this when upstream fixes the issue
export const patchedToolSchema = { ... };
```

---

### 3. Update Tool Registry

**File:** `src/core/tool-registry.ts`  
**Lines:** 32-45 (remove static schema map)

**Remove:**
```typescript
private static readonly TOOL_SCHEMAS: Record<string, ToolSchema> = {
  fetch_scripture: fetchScriptureSchema,
  // ... all 12 schemas
};
```

**Remove these methods:**
- `getStaticToolSchema(name: string)`
- `getAllStaticSchemas()`

**Keep:**
- `getAllTools()` - Already uses dynamic discovery ✅
- `getTool(name: string)` - Already uses dynamic discovery ✅
- `hasTool(name: string)` - Already uses dynamic discovery ✅
- `validateToolArgs()` - Already uses dynamic schemas ✅
- Cache management methods

**No other changes needed** - the registry already uses dynamic discovery!

---

### 4. Remove Convenience Methods

**File:** `src/core/index.ts`  
**Lines:** 126-191 (remove 8 convenience methods)

**Remove these methods:**
```typescript
async fetchScripture(args: { ... }): Promise<TextContent[]>
async fetchTranslationNotes(args: { ... }): Promise<TextContent[]>
async getSystemPrompt(args: { ... }): Promise<TextContent[]>
async fetchTranslationQuestions(args: { ... }): Promise<TextContent[]>
async getTranslationWord(args: { ... }): Promise<TextContent[]>
async browseTranslationWords(args: { ... }): Promise<TextContent[]>
async getContext(args: { ... }): Promise<TextContent[]>
async extractReferences(args: { ... }): Promise<TextContent[]>
```

**Users will now call:**
```typescript
await client.callTool('fetch_scripture', { reference: 'John 3:16' });
await client.callTool('fetch_translation_notes', { reference: 'John 3:16' });
```

**Keep:**
- `callTool(name: string, args: ToolArguments)` - Main API ✅
- `listTools()` - Tool discovery ✅
- `testConnection()` - Health check ✅
- All configuration methods ✅

---

### 5. Update Validation Logic

**File:** `src/shared/validators.ts`  
**Lines:** 107-130 (remove tool-specific switch statement)

**Current code:**
```typescript
switch (toolName) {
  case 'fetch_scripture':
    return this.validateToolArgs(toolName, args, fetchScriptureArgsSchema);
  case 'fetch_translation_notes':
    return this.validateToolArgs(toolName, args, fetchTranslationNotesArgsSchema);
  // ... 10 more cases
}
```

**New code (schema-based, tool-agnostic):**
```typescript
async validateToolCall(toolName: string, args: Record<string, any>, toolRegistry: ToolRegistry): Promise<boolean> {
  // Get schema dynamically from tool registry
  const tool = await toolRegistry.getTool(toolName);
  if (!tool) {
    return false;
  }
  
  // Validate against dynamic schema
  const required = tool.inputSchema.required || [];
  for (const field of required) {
    if (!(field in args)) {
      return false;
    }
  }
  
  return true;
}
```

**Note:** You'll need to inject `ToolRegistry` dependency into the validator.

---

### 6. Update Tests

#### A. Update Tool Count Expectations

**File:** `tests/integration/upstream-connectivity.test.ts`  
**Line:** 44

**Change:**
```typescript
// OLD
expect(tools.length).toBeGreaterThanOrEqual(12);

// NEW - with helpful message for future changes
expect(tools.length).toBe(11); // If this fails, check if upstream added/removed tools
```

#### B. Update Expected Tool Names

**File:** `tests/integration/upstream-connectivity.test.ts`  
**Line:** 123

**Change:**
```typescript
// OLD
const expectedTools = [
  'fetch_scripture',
  'fetch_translation_notes',
  'get_translation_word',  // RENAMED
  'get_context',           // REMOVED
  'browse_translation_words', // REMOVED
  'extract_references',    // REMOVED
  // ... etc
];

// NEW - current 11 tools from upstream
const expectedTools = [
  'get_system_prompt',
  'fetch_scripture',
  'fetch_translation_notes',
  'get_languages',
  'fetch_translation_questions',
  'browse_translation_words',
  'get_context',
  'extract_references',
  'fetch_resources',
  'get_words_for_reference',
  'search_biblical_resources'
];
```

**Note:** Add comment: "If this test fails, upstream may have changed. Verify at https://translation-helps-mcp.pages.dev/api/mcp"

#### C. Remove/Update Tests for Deleted Tools

**File:** `tests/integration/tool-calling.test.ts`

**Tools that still exist (update if needed):**
- `fetch_scripture` ✅ Keep
- `fetch_translation_notes` ✅ Keep  
- `fetch_translation_questions` ✅ Keep
- `browse_translation_words` ✅ Keep
- `get_context` ✅ Keep
- `extract_references` ✅ Keep

**Tools that were renamed:**
- `get_translation_word` → Still exists in upstream, keep tests

**Tools that were removed:**
- None! All tools still exist in upstream

**Action:** Update tool names in tests to match upstream, but don't remove any tests.

#### D. Update stdio Server Tests

**File:** `tests/integration/stdio-server/server.test.ts`

**Update tool name references:**
- Change any hardcoded tool names to match upstream
- Update filtering tests to use current tool names

---

### 7. Update Documentation

#### A. README.md

**Update these sections:**

1. **Tool count:** Change "12 tools" → "11 tools"
2. **Tool list:** Update to current 11 tools from upstream
3. **Examples:** Update any examples using old tool names
4. **Architecture section:** Mention MCP passthrough approach

**Add note about dynamic discovery:**
```markdown
## Dynamic Tool Discovery

This proxy uses dynamic tool discovery from the upstream MCP server. 
Tool schemas are fetched at runtime, ensuring we're always in sync with 
the upstream service. No manual updates needed when upstream adds/removes tools!
```

#### B. ARCHITECTURE.md

**Update these sections:**

1. **Tool Schemas section:** Note that schemas are now dynamic
2. **Routing Logic section:** Document MCP passthrough approach
3. **Tool count:** Update from 12 to 11
4. **Remove:** References to individual REST endpoints

**Add section:**
```markdown
## MCP Passthrough Architecture

The proxy now uses pure MCP protocol passthrough:
- All tools accessed via `/api/mcp` endpoint
- No custom routing logic
- Dynamic tool discovery
- Future-proof against upstream changes
```

#### C. Update Examples (if needed)

**Files to check:**
- `examples/claude-desktop-config.json`
- `examples/claude-desktop-config-filtered.json`
- `examples/cline-config.json`
- `examples/llm-helper/*.ts`

**What to update:**
- Tool names in examples (if any hardcoded)
- API usage examples (use `callTool()` instead of convenience methods)

**Note:** Most examples should still work since they use the generic interface.

---

### 8. Update Version Number

**File:** `package.json`  
**Line:** 3

**Change:**
```json
{
  "version": "0.1.0"
}
```

**To:**
```json
{
  "version": "0.2.0"
}
```

**Reason:** Breaking changes (removed convenience methods, changed internal architecture)

---

## Testing Strategy

### 1. Run Full Test Suite

```bash
npm test
```

**Expected results:**
- All 162 tests should pass (currently 21 failing)
- No new test failures
- Tests run in ~37 seconds

### 2. Run Linter

```bash
npm run lint
```

**Fix any linting errors** that arise from the changes.

### 3. Manual Testing

Test each interface:

```bash
# Interface 1: Core API
npm run build
node -e "
const { TranslationHelpsClient } = require('./dist/cjs/core/index.js');
const client = new TranslationHelpsClient();
client.callTool('fetch_scripture', { reference: 'John 3:16' })
  .then(r => console.log('✅ Core API works'))
  .catch(e => console.error('❌ Core API failed:', e));
"

# Interface 2: MCP HTTP Server
npm run dev:http &
sleep 5
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | jq '.tools | length'  # Should output 11

# Interface 3: stdio MCP Server
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npm run dev

# Interface 4: OpenAI API
npm run dev:http &
sleep 5
curl http://localhost:8787/v1/tools | jq '.tools | length'  # Should output 11

# Interface 5: LLM Helper
node -e "
const { LLMHelper } = require('./dist/cjs/llm-helper/index.js');
const helper = new LLMHelper({ apiKey: 'test' });
console.log('✅ LLM Helper loads');
"
```

---

## Files to Modify

### Critical Changes (Must Do)

1. ✅ `src/core/upstream-client.ts` - Replace routing logic
2. ✅ `src/core/types.ts` - Remove tool schemas
3. ✅ `src/core/tool-registry.ts` - Remove static schemas
4. ✅ `src/core/index.ts` - Remove convenience methods
5. ✅ `src/shared/validators.ts` - Update validation logic
6. ✅ `tests/integration/upstream-connectivity.test.ts` - Update expectations
7. ✅ `tests/integration/tool-calling.test.ts` - Update tool names
8. ✅ `tests/integration/stdio-server/server.test.ts` - Update tool names
9. ✅ `README.md` - Update documentation
10. ✅ `ARCHITECTURE.md` - Update architecture docs
11. ✅ `package.json` - Bump version to 0.2.0

### Optional Changes (Nice to Have)

12. ⚠️ `examples/*.json` - Update if they reference old tool names
13. ⚠️ `examples/llm-helper/*.ts` - Update if they use convenience methods

---

## Code Reduction Summary

| Component | Before | After | Saved |
|-----------|--------|-------|-------|
| Routing logic | ~90 lines | ~10 lines | 80 lines |
| Tool schemas | ~250 lines | 0 lines | 250 lines |
| Convenience methods | ~50 lines | 0 lines | 50 lines |
| Validation logic | ~25 lines | ~10 lines | 15 lines |
| Static schema map | ~20 lines | 0 lines | 20 lines |
| **Total** | **~435 lines** | **~20 lines** | **~415 lines** |

**Percentage reduction:** 8% of codebase (~5000 lines → ~4585 lines)

---

## Benefits

### 1. Future-Proof
- ✅ New tools work automatically
- ✅ Tool renames don't break us
- ✅ Schema changes sync automatically
- ✅ No manual updates needed

### 2. Simpler Codebase
- ✅ 415 lines removed
- ✅ Easier to understand
- ✅ Less to maintain
- ✅ Fewer bugs

### 3. Always In Sync
- ✅ Schemas match upstream
- ✅ No drift between versions
- ✅ Automatic updates

### 4. More Flexible
- ✅ Works with any upstream
- ✅ Supports custom tools
- ✅ No hardcoded assumptions
- ✅ Truly generic proxy

---

## Risks & Mitigations

### Risk 1: Breaking Changes for Users

**Risk:** Removing convenience methods breaks existing code

**Mitigation:** 
- Version bump to 0.2.0 signals breaking changes
- No users yet (per project owner)
- Update all examples and documentation

### Risk 2: Upstream Changes

**Risk:** Upstream might change tool names/schemas again

**Mitigation:**
- Dynamic discovery means we adapt automatically
- Tests will catch changes (tool count check)
- No code changes needed, just test updates

### Risk 3: Response Format Changes

**Risk:** Upstream response format might differ from expectations

**Mitigation:**
- ResponseFormatter is already format-agnostic
- Handles both direct data and MCP content format
- May need minor adjustment to parse JSON from text field

### Risk 4: Performance

**Risk:** MCP protocol might be slower than direct REST

**Mitigation:**
- Verified performance is excellent (~1.5s with caching)
- Upstream has good caching strategy
- Retry logic with exponential backoff already in place

---

## Verification Checklist

After implementation, verify:

- [ ] All 162 tests pass
- [ ] Linter passes with no errors or warnings
- [ ] Version bumped to 0.2.0
- [ ] README updated with new tool count
- [ ] ARCHITECTURE.md updated
- [ ] Examples updated (if needed)
- [ ] Manual testing of all 5 interfaces works
- [ ] No hardcoded tool schemas remain (except patches)
- [ ] Routing uses pure MCP passthrough
- [ ] Convenience methods removed
- [ ] Dynamic tool discovery works
- [ ] Retry logic with exponential backoff preserved

---

## Implementation Order

Follow this order to minimize issues:

1. **Update routing** (`upstream-client.ts`) - Core change
2. **Remove schemas** (`types.ts`, `tool-registry.ts`) - Cleanup
3. **Remove convenience methods** (`index.ts`) - API simplification
4. **Update validation** (`validators.ts`) - Use dynamic schemas
5. **Update tests** - Fix expectations
6. **Update documentation** - README, ARCHITECTURE
7. **Update examples** - If needed
8. **Bump version** - package.json
9. **Run tests** - Verify everything works
10. **Run linter** - Clean up any issues

---

## Success Criteria

Implementation is complete when:

1. ✅ All 162 tests pass
2. ✅ Linter passes
3. ✅ ~415 lines of code removed
4. ✅ All 5 interfaces work correctly
5. ✅ Documentation updated
6. ✅ Version bumped to 0.2.0
7. ✅ No hardcoded tool schemas (except patches)
8. ✅ Pure MCP passthrough routing
9. ✅ Dynamic tool discovery working
10. ✅ Retry logic preserved

### 9. Update References to Upstream MCP Compliance

**Important:** The upstream service is now **fully MCP-compliant** as of v6.6.3. Update all documentation that implies otherwise.

#### A. ARCHITECTURE.md

**Lines 433-488:** Update the routing logic section

**Change from:**
```
**Routing Logic** (preserved from Python):
```typescript
private routeToolCall(toolName: string, args: Record<string, any>) {
  const baseUrl = this.config.upstreamUrl.replace('/api/mcp', '');
  
  switch (toolName) {
    case 'fetch_scripture':
      return this.get(`${baseUrl}/api/fetch-scripture`, args);
    // ... individual REST endpoints
  }
}
```

**Change to:**
```
**Routing Logic** (MCP Passthrough):
```typescript
private routeToolCall(toolName: string, args: Record<string, any>) {
  // Pure MCP passthrough - upstream is fully MCP-compliant as of v6.6.3
  return {
    url: this.config.upstreamUrl,
    options: {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: toolName, arguments: args }
      })
    }
  };
}
```

**Line 1034:** Update note about tool schemas

**Change from:**
```
**Note**: Tool schemas are statically defined in [`types.ts`](src/core/types.ts:1) for validation and type safety, but the tool registry dynamically discovers available tools from the upstream server at runtime.
```

**Change to:**
```
**Note**: Tool schemas are dynamically discovered from the upstream MCP server at runtime. The upstream is fully MCP-compliant as of v6.6.3, providing all tool schemas via the `tools/list` endpoint.
```

#### B. README.md

**Line 660:** Update acknowledgments

**Change from:**
```
- **Translation Helps MCP** - Upstream server
```

**Change to:**
```
- **Translation Helps MCP** - Fully MCP-compliant upstream server (v6.6.3+)
```

**After line 35:** Add upstream service note

### 10. Refactor Upstream Response Fetcher Script

**File:** `scripts/fetch-upstream-responses.ts`

**Current Issue:** The script tries to fetch from individual REST endpoints that no longer exist (returning 404). It needs to be refactored to use the MCP protocol.

**Purpose of the tool (still valuable):**
1. **Ground truth** for actual upstream response formats
2. **Test fixtures** for unit and integration tests
3. **Documentation** of API behavior
4. **Change detection** - can diff when upstream API updates

**⚠️ CRITICAL WARNING FOR IMPLEMENTATION AGENT:**

**DO NOT use the saved response files to add tool-specific behavior to the production codebase!**

The whole point of this refactor is to make the proxy **tool-agnostic** and **dynamic**. The saved responses are ONLY for:
- ✅ **Test fixtures** - Use in unit/integration tests for offline testing
- ✅ **Test assertions** - Verify response formats in test suite
- ✅ **Documentation** - Document response formats for developers
- ✅ **Change detection** - Detect breaking changes in upstream responses

**You must NOT use saved responses in production code (`src/` directory):**
- ❌ Parse specific fields from saved responses to add custom logic in `src/`
- ❌ Add tool-specific formatting based on saved response structure in `src/`
- ❌ Create tool-specific handlers based on response patterns in `src/`
- ❌ Hardcode any assumptions about response formats in `src/`

**Exception: Tests (`tests/` directory) CAN use saved responses as fixtures.**

**The proxy production code must remain completely generic and work with ANY tool, including tools that don't exist yet.**

**Refactor approach:**

**Change lines 85-105** from individual REST endpoints to MCP protocol:

```typescript
async function fetchViaMCP(tool: string, params: Record<string, any>): Promise<any> {
  const url = `${UPSTREAM_URL}/api/mcp`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: tool,
        arguments: params
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const mcpResponse = await response.json();
  
  // Extract the actual data from MCP response
  if (mcpResponse.error) {
    throw new Error(`MCP Error: ${mcpResponse.error.message}`);
  }
  
  return mcpResponse.result;
}
```

**Update `fetchResponse()` function (lines 107-131):**

```typescript
async function fetchResponse(testCase: TestCase): Promise<any> {
  console.log(`Fetching ${testCase.tool}...`);
  console.log(`  Via MCP: ${UPSTREAM_URL}/api/mcp`);
  
  try {
    const data = await fetchViaMCP(testCase.tool, testCase.params);
    console.log(`  ✓ Success (${JSON.stringify(data).length} bytes)`);
    return data;
  } catch (error) {
    console.error(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
```

**Remove the `getEndpointUrl()` function** (lines 85-105) - no longer needed.

**Remove the `buildQueryString()` function** (lines 78-83) - no longer needed.

**Benefits of refactoring:**
- ✅ Works with current upstream architecture
- ✅ Future-proof against endpoint changes
- ✅ Simpler code (fewer lines)
- ✅ Consistent with how the proxy now works
- ✅ Can capture all 11 tools, not just 7

**Alternative:** If you prefer to delete it entirely, that's also reasonable since:
- Integration tests already test against live upstream
- The saved responses will become stale quickly
- Dynamic discovery means we don't need static fixtures

**Recommendation:** **Refactor it** rather than delete it. It's useful for:
- Debugging response format changes
- Creating test fixtures for offline testing
- Documenting actual API behavior
- Detecting breaking changes in upstream


Add this new section:
```markdown
### Upstream Service

The upstream translation-helps-mcp service is **fully MCP-compliant** (as of v6.6.3), providing all tools via the standard MCP protocol at `https://translation-helps-mcp.pages.dev/api/mcp`. This proxy uses dynamic tool discovery to stay in sync with upstream changes automatically.
```

#### C. Search and Replace

Search the entire codebase for these phrases and update them:
- "not MCP compliant" → "fully MCP-compliant"
- "custom REST endpoints" → "MCP protocol endpoints"
- "individual API endpoints" → "MCP tools/call endpoint"
- "preserved from Python" → "updated to use MCP passthrough"

---

---

## Notes for Implementation Agent

### Key Principles

1. **Be generic, not specific** - Don't hardcode tool names
2. **Trust the upstream** - Use dynamic discovery
3. **Keep it simple** - Remove complexity, don't add it
4. **Preserve what works** - Keep retry logic, caching, filtering
5. **Test thoroughly** - Run full test suite + linter

### What NOT to Change

- ❌ Don't touch FilterEngine - it's already tool-agnostic
- ❌ Don't touch ResponseFormatter - it's already format-agnostic
- ❌ Don't touch retry logic - it already has exponential backoff
- ❌ Don't touch caching - it already works well
- ❌ Don't touch any of the 5 interface implementations - they use abstractions

### What TO Change

- ✅ Routing logic - make it pure MCP passthrough
- ✅ Tool schemas - remove hardcoded ones
- ✅ Convenience methods - remove them
- ✅ Validation - use dynamic schemas
- ✅ Tests - update expectations
- ✅ Documentation - update tool counts and examples

### If You Get Stuck

1. Check `UPSTREAM_MCP_VERIFICATION.md` for live testing examples
2. The upstream MCP endpoint is: `https://translation-helps-mcp.pages.dev/api/mcp`
3. Test with curl to verify behavior
4. All 11 tools are accessible via MCP protocol
5. Response format is MCP TextContent with JSON-encoded data

---

## Estimated Timeline

- **Routing update:** 30 minutes
- **Schema removal:** 30 minutes
- **Convenience methods removal:** 15 minutes
- **Validation update:** 30 minutes
- **Test updates:** 1 hour
- **Documentation updates:** 1 hour
- **Testing & verification:** 1 hour
- **Buffer for issues:** 30 minutes

**Total:** 4-6 hours

---

## Contact

If you have questions during implementation, refer to:
- `UPSTREAM_MCP_VERIFICATION.md` - Live testing results
- `CODE_ISOLATION_ANALYSIS.md` - Architecture quality assessment
- `DYNAMIC_TOOL_DISCOVERY_ANALYSIS.md` - Tool discovery details

**Good luck with the implementation!** 🚀