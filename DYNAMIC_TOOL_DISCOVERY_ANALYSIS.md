# Dynamic Tool Discovery: Eliminating Hardcoded Tool References

## Executive Summary

**Yes! We can eliminate ~90% of hardcoded tool references!** 

Currently we have tool names hardcoded in 7 files. With dynamic discovery, we can reduce this to just 2 files (tests and fetch script).

---

## Current State: Hardcoded Tool References

### Files with Tool-Specific Code

| File | Tool References | Can Remove? | Notes |
|------|----------------|-------------|-------|
| `src/core/types.ts` | 12 tool schemas | ✅ YES | Use dynamic discovery |
| `src/core/tool-registry.ts` | 12 tool schemas | ✅ YES | Already uses dynamic discovery |
| `src/core/index.ts` | 8 convenience methods | ⚠️ OPTIONAL | Nice-to-have for TypeScript users |
| `src/core/upstream-client.ts` | 7 routing cases | ✅ YES | Replace with MCP passthrough |
| `src/core/response-formatter.ts` | 0 (format-agnostic) | ✅ NONE | Already dynamic! |
| `src/shared/validators.ts` | 12 validation cases | ✅ YES | Use schema-based validation |
| `src/stdio-server/index.ts` | Examples only | ✅ YES | Just documentation |
| `src/openai-api/routes.ts` | Default config | ⚠️ KEEP | Sensible defaults |
| `scripts/fetch-upstream-responses.ts` | 7 test cases | ⚠️ KEEP | Testing tool |
| `tests/**/*.ts` | Many references | ⚠️ KEEP | Test assertions |

---

## What Can Be Removed

### ✅ 1. Tool Schemas in `src/core/types.ts` (Lines 12-250)

**Current:** 12 hardcoded tool schemas (~250 lines)

```typescript
export const fetchScriptureSchema = {
  name: 'fetch_scripture',
  description: 'Fetch Bible scripture text...',
  inputSchema: { ... }
};
// ... 11 more schemas
```

**New:** Remove entirely, use dynamic discovery

```typescript
// DELETE all tool schemas
// We fetch them dynamically from upstream via listTools()
```

**Why this works:**
- `ToolRegistry.getAllTools()` already fetches from upstream
- Schemas are only used for static validation (rarely needed)
- Dynamic schemas are always up-to-date

**Lines saved:** ~250 lines

---

### ✅ 2. Static Schemas in `src/core/tool-registry.ts` (Lines 32-45)

**Current:** Hardcoded schema map

```typescript
private static readonly TOOL_SCHEMAS: Record<string, ToolSchema> = {
  fetch_scripture: fetchScriptureSchema,
  fetch_translation_notes: fetchTranslationNotesSchema,
  // ... 10 more
};
```

**New:** Remove entirely

```typescript
// DELETE TOOL_SCHEMAS constant
// DELETE getStaticToolSchema() method
// DELETE getAllStaticSchemas() method
// We already use dynamic discovery via getAllTools()
```

**Why this works:**
- Already using `upstreamClient.listTools()` for dynamic discovery
- Static schemas are redundant
- Only used for offline validation (edge case)

**Lines saved:** ~20 lines + 3 methods

---

### ✅ 3. Routing Logic in `src/core/upstream-client.ts` (Lines 149-240)

**Current:** Tool-specific routing

```typescript
switch (toolName) {
  case 'fetch_scripture':
    return { url: `${baseUrl}/api/fetch-scripture?...` };
  case 'fetch_translation_notes':
    return { url: `${baseUrl}/api/translation-notes?...` };
  // ... 7 more cases
}
```

**New:** Pure MCP passthrough (tool-agnostic)

```typescript
// No switch statement needed!
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
```

**Why this works:**
- Upstream handles all tools via MCP protocol
- No need to know individual endpoints
- Works for any tool (current and future)

**Lines saved:** ~90 lines

---

### ✅ 4. Validation Logic in `src/shared/validators.ts` (Lines 107-130)

**Current:** Tool-specific validation

```typescript
switch (toolName) {
  case 'fetch_scripture':
    return this.validateToolArgs(toolName, args, fetchScriptureArgsSchema);
  case 'fetch_translation_notes':
    return this.validateToolArgs(toolName, args, fetchTranslationNotesArgsSchema);
  // ... 10 more cases
}
```

**New:** Schema-based validation (tool-agnostic)

```typescript
async validateToolCall(toolName: string, args: Record<string, any>): Promise<boolean> {
  // Get schema dynamically from tool registry
  const tool = await this.toolRegistry.getTool(toolName);
  if (!tool) return false;
  
  // Validate against dynamic schema
  return this.validateAgainstSchema(args, tool.inputSchema);
}
```

**Why this works:**
- Tool schemas come from upstream
- Validation logic is generic
- Works for any tool structure

**Lines saved:** ~25 lines

---

## What Should Be Kept

### ⚠️ 1. Convenience Methods in `src/core/index.ts` (Optional)

**Current:** Type-safe convenience methods

```typescript
async fetchScripture(args: { reference: string; ... }): Promise<TextContent[]> {
  return this.callTool('fetch_scripture', args);
}

async fetchTranslationNotes(args: { reference: string; ... }): Promise<TextContent[]> {
  return this.callTool('fetch_translation_notes', args);
}
// ... 6 more methods
```

**Options:**

**Option A: Keep them (RECOMMENDED for TypeScript users)**
- Provides type safety
- Better IDE autocomplete
- Clearer API for common tools
- Only ~50 lines of code

**Option B: Remove them (Pure dynamic)**
- Users call `callTool('tool_name', args)` directly
- More flexible but less type-safe
- Saves ~50 lines

**Recommendation:** KEEP for now
- TypeScript users benefit from type safety
- Not a maintenance burden (just thin wrappers)
- Can deprecate later if unused

---

### ⚠️ 2. Default Config in `src/openai-api/routes.ts` (Line 44)

**Current:** Sensible default

```typescript
const handler = new ChatCompletionHandler({
  enabledTools: config.enabledTools ?? ['fetch_translation_notes'],
  hiddenParams: config.hiddenParams ?? ['language', 'organization'],
  // ...
});
```

**Keep this!**
- Provides sensible default for OpenAI API interface
- Users can override via config
- Not a hardcoded requirement, just a default

---

### ⚠️ 3. Test Cases in `scripts/fetch-upstream-responses.ts`

**Current:** Test cases for specific tools

```typescript
const testCases: TestCase[] = [
  { tool: 'fetch_scripture', params: { ... } },
  { tool: 'fetch_translation_notes', params: { ... } },
  // ... 5 more
];
```

**Keep this!**
- Testing tool needs specific examples
- Not part of production code
- Useful for validation

---

### ⚠️ 4. Test Assertions in `tests/**/*.ts`

**Current:** Tool-specific test cases

```typescript
it('should fetch scripture for John 3:16', async () => {
  const result = await client.callTool('fetch_scripture', { ... });
  expect(result).toBeDefined();
});
```

**Keep this!**
- Tests need to verify specific tools work
- Not a maintenance burden
- Important for regression testing

---

## Where Tool-Specific Code is Still Needed

### 1. Response Formatting (Already Dynamic!)

**Current state:** `src/core/response-formatter.ts` is already tool-agnostic!

```typescript
static formatResponse(response: any): TextContent[] {
  // Detects format by structure, not by tool name
  if ('scripture' in response) return this.formatScripture(response);
  if ('items' in response) return this.formatNotes(response);
  if ('words' in response) return this.formatWords(response);
  // ... etc
}
```

**No changes needed!** ✅

### 2. Filtering (Already Tool-Agnostic!)

**Current state:** `src/core/filter-engine.ts` works on any tool

```typescript
filterTools(tools: Tool[]): Tool[] {
  // Works on any tool array, doesn't know about specific tools
  return tools.filter(tool => this.isToolEnabled(tool.name));
}
```

**No changes needed!** ✅

### 3. OpenAI Tool Mapping (Already Generic!)

**Current state:** `src/openai-api/tool-mapper.ts` converts any MCP tool to OpenAI format

```typescript
static mcpToOpenAI(mcpTool: MCPTool): OpenAITool {
  // Generic conversion, works for any tool
  return {
    type: 'function',
    function: {
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: mcpTool.inputSchema
    }
  };
}
```

**No changes needed!** ✅

---

## Implementation Plan

### Phase 1: Remove Hardcoded Schemas

1. **Delete from `src/core/types.ts`:**
   - Remove all 12 tool schema exports (~250 lines)
   - Keep only the type definitions (Tool, ToolSchema, etc.)

2. **Delete from `src/core/tool-registry.ts`:**
   - Remove `TOOL_SCHEMAS` constant
   - Remove `getStaticToolSchema()` method
   - Remove `getAllStaticSchemas()` method
   - Keep `getAllTools()` (already dynamic)

3. **Update imports:**
   - Remove schema imports from files that used them
   - Update to use dynamic discovery

**Lines removed:** ~270 lines

---

### Phase 2: Simplify Routing

1. **Replace `routeToolCall()` in `src/core/upstream-client.ts`:**
   - Remove switch statement (~90 lines)
   - Replace with pure MCP passthrough (~10 lines)

**Lines removed:** ~80 lines

---

### Phase 3: Simplify Validation

1. **Update `src/shared/validators.ts`:**
   - Remove tool-specific switch statement
   - Use schema-based validation with dynamic schemas
   - Inject ToolRegistry dependency

**Lines removed:** ~25 lines

---

### Phase 4: Update Documentation

1. **Update examples in `src/stdio-server/index.ts`:**
   - Keep examples but note they're just examples
   - Add note that any tool from upstream works

**Lines changed:** ~5 lines (documentation only)

---

## Total Impact

### Lines of Code Reduction

| Category | Current | After | Saved |
|----------|---------|-------|-------|
| Tool schemas | ~250 | 0 | 250 |
| Static schema map | ~20 | 0 | 20 |
| Routing logic | ~90 | ~10 | 80 |
| Validation logic | ~25 | ~10 | 15 |
| **Total** | **~385** | **~20** | **~365 lines** |

### Maintenance Burden Reduction

| Aspect | Before | After |
|--------|--------|-------|
| **Adding new tool** | Update 4 files | Zero changes |
| **Removing tool** | Update 4 files | Zero changes |
| **Renaming tool** | Update 4 files | Zero changes |
| **Changing schema** | Update 2 files | Zero changes |
| **Upstream updates** | Manual sync | Automatic |

---

## Benefits

### 1. Future-Proof
- ✅ New tools work automatically
- ✅ Tool renames don't break us
- ✅ Schema changes sync automatically
- ✅ No manual updates needed

### 2. Less Code
- ✅ ~365 lines removed (7% reduction)
- ✅ Simpler codebase
- ✅ Easier to understand
- ✅ Less to test

### 3. Always In Sync
- ✅ Schemas always match upstream
- ✅ No drift between versions
- ✅ No manual synchronization
- ✅ Automatic updates

### 4. More Flexible
- ✅ Works with any upstream
- ✅ Supports custom tools
- ✅ No hardcoded assumptions
- ✅ Truly generic proxy

---

## Risks & Mitigations

### Risk 1: Loss of Type Safety

**Risk:** Removing convenience methods loses TypeScript types

**Mitigation:**
- Keep convenience methods for common tools
- Generate types from dynamic schemas (future enhancement)
- Document generic `callTool()` method

**Decision:** Keep convenience methods (minimal cost, high value)

---

### Risk 2: Offline Validation

**Risk:** Can't validate without upstream connection

**Mitigation:**
- Cache schemas locally (already doing this)
- Graceful degradation (skip validation if offline)
- Most use cases are online anyway

**Decision:** Accept this tradeoff (rare edge case)

---

### Risk 3: Breaking Changes

**Risk:** Removing schemas might break existing code

**Mitigation:**
- Schemas are internal implementation detail
- Public API (`callTool()`) unchanged
- Convenience methods unchanged
- Only internal validation affected

**Decision:** No breaking changes to public API

---

## Recommendation

### Implement All 4 Phases

1. ✅ **Remove hardcoded schemas** - Biggest win, no downside
2. ✅ **Simplify routing** - Already planned, enables everything else
3. ✅ **Simplify validation** - Natural consequence of #1 and #2
4. ✅ **Update documentation** - Minimal effort

### Keep These

1. ⚠️ **Convenience methods** - Small cost, high value for TypeScript users
2. ⚠️ **Default config** - Sensible defaults for OpenAI API
3. ⚠️ **Test cases** - Necessary for testing
4. ⚠️ **Fetch script** - Useful development tool

---

## Final Architecture

### Before (Tool-Specific)
```
┌─────────────────────────────────────────┐
│ Hardcoded Tool Schemas (250 lines)     │
│ - fetch_scripture                       │
│ - fetch_translation_notes               │
│ - get_translation_word                  │
│ - ... 9 more                            │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ Tool-Specific Routing (90 lines)       │
│ - switch (toolName) { ... }             │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ Tool-Specific Validation (25 lines)    │
│ - switch (toolName) { ... }             │
└─────────────────────────────────────────┘
```

### After (Dynamic)
```
┌─────────────────────────────────────────┐
│ Dynamic Tool Discovery                  │
│ - upstreamClient.listTools()            │
│ - Fetches schemas from upstream         │
│ - Works for ANY tool                    │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ Generic MCP Passthrough (10 lines)     │
│ - Works for any tool                    │
│ - No tool-specific logic                │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ Schema-Based Validation (10 lines)     │
│ - Uses dynamic schemas                  │
│ - Works for any tool                    │
└─────────────────────────────────────────┘
```

---

## Conclusion

**Yes, we can eliminate ~90% of hardcoded tool references!**

- ✅ Remove ~365 lines of tool-specific code
- ✅ Keep ~50 lines of convenience methods (optional)
- ✅ Future-proof against upstream changes
- ✅ Automatic support for new tools
- ✅ No maintenance burden

**The only places we keep tool names:**
1. Convenience methods (optional, for TypeScript users)
2. Default config (sensible defaults)
3. Tests (necessary for validation)
4. Fetch script (development tool)

This is the right architecture for a proxy - be as generic as possible and let the upstream define the tools!