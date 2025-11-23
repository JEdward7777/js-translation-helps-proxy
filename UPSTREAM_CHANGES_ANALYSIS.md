# Upstream Translation Helps MCP Server Changes Analysis

**Date:** 2025-11-23  
**Project:** js-translation-helps-proxy  
**Upstream Service:** translation-helps-mcp (v6.6.3)

## Executive Summary

The upstream translation-helps-mcp service has undergone a major architectural overhaul (v6.6.3) that breaks compatibility with our proxy. The changes include:

- **Tool consolidation**: 11 tools (down from 12)
- **Tool renames**: Several tools have been renamed
- **Endpoint removals**: Multiple API endpoints have been removed
- **New capabilities**: Added MCP Prompts feature
- **Architecture change**: Unified resource fetcher replacing individual endpoints

**Impact:** 21 tests failing, primarily due to 404 errors on removed endpoints.

## 🎯 MAJOR SIMPLIFICATION OPPORTUNITY

**The upstream is now fully MCP-compliant!** This means we can dramatically simplify our proxy architecture:

### Current Architecture (Complex)
```
Our Proxy → Custom Routing Logic → Individual REST Endpoints → Upstream
           → Tool Schema Definitions
           → Response Formatting
           → Filter Engine
```

### Proposed Architecture (Simple)
```
Our Proxy → MCP Protocol Passthrough → Upstream MCP Server
           → Optional Filtering Layer (if needed)
```

**Why this works:**
1. ✅ Upstream handles ALL MCP protocol details (tools/list, tools/call, prompts/list, prompts/get)
2. ✅ Upstream provides complete tool schemas via MCP
3. ✅ Upstream formats responses correctly
4. ✅ We can act as a **transparent proxy** with optional filtering

**What we can eliminate:**
- ❌ Custom tool routing logic (149 lines in upstream-client.ts)
- ❌ Hardcoded tool schemas (if we just pass through)
- ❌ Response formatting (upstream handles it)
- ❌ Individual endpoint mappings

**What we keep:**
- ✅ Filtering layer (enabledTools, hiddenParams, filterBookChapterNotes)
- ✅ Multiple interface support (stdio, HTTP, OpenAI API)
- ✅ Caching (if desired)
- ✅ Authentication/authorization (if needed)

---

## 1. Tool Changes

### 1.1 Tools Removed

| Old Tool Name | Status | Replacement |
|--------------|--------|-------------|
| `get_context` | ❌ REMOVED | No direct replacement |
| `browse_translation_words` | ❌ REMOVED | Use `fetch_translation_word` with search |
| `extract_references` | ❌ REMOVED | No replacement |
| `fetch_resources` | ❌ REMOVED | Use individual fetch endpoints |
| `get_words_for_reference` | ❌ REMOVED | Use `fetch_translation_word_links` |
| `search_resources` | ❌ REMOVED | Use new `search_biblical_resources` |
| `get_languages` | ❌ REMOVED | Use `/api/simple-languages` endpoint |

### 1.2 Tools Renamed

| Old Name | New Name | Notes |
|----------|----------|-------|
| `get_translation_word` | `fetch_translation_word` | Functionality expanded |
| N/A | `fetch_translation_word_links` | NEW - replaces `get_words_for_reference` |
| N/A | `fetch_translation_academy` | NEW - translation training modules |
| N/A | `search_biblical_resources` | NEW - BM25 search algorithm |

### 1.3 Tools Unchanged

| Tool Name | Status |
|-----------|--------|
| `fetch_scripture` | ✅ Still works |
| `fetch_translation_notes` | ⚠️ Endpoint changed (see below) |
| `fetch_translation_questions` | ⚠️ Endpoint changed (see below) |

---

## 2. API Endpoint Changes

### 2.1 Removed Endpoints

The following REST API endpoints no longer exist:

```
❌ /api/translation-notes          → 404 Not Found
❌ /api/translation-questions       → 404 Not Found
❌ /api/fetch-translation-words     → 404 Not Found
❌ /api/browse-translation-words    → 404 Not Found
❌ /api/get-context                 → 404 Not Found
❌ /api/extract-references          → 404 Not Found
```

### 2.2 Working Endpoints

```
✅ /api/fetch-scripture             → Still works
✅ /api/mcp                         → MCP protocol endpoint (tools/list, tools/call)
```

### 2.3 New Endpoints (from README)

According to the updated upstream README, these new endpoints exist:

```
NEW /api/fetch-translation-word-links    → Get word links for a reference
NEW /api/fetch-translation-academy       → Get training modules
NEW /api/browse-translation-academy      → Browse academy modules
NEW /api/simple-languages                → Get available languages
NEW /api/get-available-books             → Get available books
NEW /api/resource-catalog                → Resource catalog
```

---

## 3. MCP Tool Schema Changes

### 3.1 Current Tool List (from upstream)

The upstream now exposes **11 tools** via MCP:

1. `fetch_scripture` - ✅ Unchanged
2. `fetch_translation_notes` - ⚠️ Schema may have changed
3. `fetch_translation_questions` - ⚠️ Schema may have changed
4. `fetch_translation_word_links` - 🆕 NEW (replaces get_words_for_reference)
5. `fetch_translation_word` - 🔄 RENAMED from get_translation_word
6. `fetch_translation_academy` - 🆕 NEW
7. `search_biblical_resources` - 🆕 NEW (replaces search_resources)
8. ~~get_translation_word~~ - ❌ REMOVED (renamed)
9. ~~get_context~~ - ❌ REMOVED
10. ~~get_languages~~ - ❌ REMOVED
11. ~~browse_translation_words~~ - ❌ REMOVED
12. ~~extract_references~~ - ❌ REMOVED
13. ~~fetch_resources~~ - ❌ REMOVED
14. ~~get_words_for_reference~~ - ❌ REMOVED
15. ~~search_resources~~ - ❌ REMOVED

### 3.2 New MCP Prompts Feature

The upstream now supports **MCP Prompts** (a new MCP capability):

1. `translation-helps-for-passage` - Comprehensive workflow
2. `get-translation-words-for-passage` - Word definitions workflow
3. `get-translation-academy-for-passage` - Academy articles workflow

**Note:** Our proxy does not currently support MCP Prompts.

---

## 4. Architecture Changes

### 4.1 Unified Resource Fetcher

The upstream has moved to a unified architecture:

```
OLD: Individual endpoint handlers
NEW: UnifiedResourceFetcher → ZipResourceFetcher2 → DCS
```

### 4.2 Data Source Changes

- **100% Real Data**: All mock data removed
- **No Fallbacks**: Real errors instead of fake success
- **Caching Strategy**: KV for catalogs, R2 for ZIPs, Cache API for files

### 4.3 Format Support

All endpoints now support multiple formats:
- `format=json` (default)
- `format=md` (markdown for LLMs)
- `format=text` (plain text)

---

## 5. Breaking Changes Impact

### 5.1 Test Failures

**21 tests failing** due to:

1. **404 Errors** (18 failures):
   - `fetch_translation_notes` - endpoint moved/changed
   - `fetch_translation_questions` - endpoint moved/changed
   - `get_translation_word` - tool renamed
   - `get_context` - tool removed
   - `extract_references` - tool removed

2. **Tool Count Mismatch** (1 failure):
   - Expected: 12 tools
   - Actual: 11 tools

3. **Missing Tools** (1 failure):
   - `get_translation_word` not found (renamed to `fetch_translation_word`)

4. **Timeout** (1 failure):
   - Error handling test timing out

### 5.2 Affected Components

#### In `src/core/upstream-client.ts`:

The routing logic is broken for these tools:

```typescript
// BROKEN - These endpoints return 404
case 'fetch_translation_notes':
  return this.get(`${baseUrl}/api/translation-notes`, args);  // ❌ 404

case 'fetch_translation_questions':
  return this.get(`${baseUrl}/api/translation-questions`, args);  // ❌ 404

case 'get_translation_word':
case 'fetch_translation_words':
  return this.get(`${baseUrl}/api/fetch-translation-words`, args);  // ❌ 404

case 'browse_translation_words':
  return this.get(`${baseUrl}/api/browse-translation-words`, args);  // ❌ 404

case 'get_context':
  return this.get(`${baseUrl}/api/get-context`, args);  // ❌ 404

case 'extract_references':
  return this.get(`${baseUrl}/api/extract-references`, args);  // ❌ 404
```

#### In `src/core/types.ts`:

Tool schemas need updating:
- Remove: `get_translation_word`, `get_context`, `browse_translation_words`, `extract_references`, `fetch_resources`, `get_words_for_reference`, `search_resources`, `get_languages`
- Add: `fetch_translation_word`, `fetch_translation_word_links`, `fetch_translation_academy`, `search_biblical_resources`

---

## 6. Required Changes

### 6.1 Critical Path (Must Fix)

1. **Update Tool Routing** in `src/core/upstream-client.ts`:
   - Remove routing for deleted tools
   - Update tool names (get_translation_word → fetch_translation_word)
   - Add routing for new tools
   - **IMPORTANT**: Since REST endpoints are gone, we must use MCP protocol for all tools

2. **Fix MCP-Only Approach**:
   - The upstream no longer exposes individual REST endpoints
   - All tool calls must go through `/api/mcp` endpoint using MCP protocol
   - Update `routeToolCall()` to use MCP `tools/call` for all tools

3. **Update Tool Schemas** in `src/core/types.ts`:
   - Remove 8 old tool schemas
   - Add 4 new tool schemas
   - Update descriptions and parameters

4. **Update Tests**:
   - Remove tests for deleted tools
   - Update tool name references
   - Adjust expected tool count (12 → 11)

### 6.2 Optional Enhancements

1. **Add MCP Prompts Support**:
   - Implement prompts capability in MCP server interface
   - Add prompt handlers for the 3 new prompts

2. **Add Format Support**:
   - Support `format` parameter in tool calls
   - Allow clients to request markdown format

3. **Update Documentation**:
   - Update README with new tool list
   - Update ARCHITECTURE.md with changes
   - Add migration guide for users

---

## 7. Implementation Strategy

### Phase 1: Simplify to MCP Passthrough (RECOMMENDED)

**Goal:** Eliminate custom routing entirely and act as MCP proxy

**Option A: Pure Passthrough (Simplest)**

Replace the entire routing logic with direct MCP protocol forwarding:

```typescript
// In src/core/upstream-client.ts
private async routeToolCall(toolName: string, args: Record<string, any>) {
  // Simply forward to upstream MCP endpoint - no custom routing!
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

**Benefits:**
- ✅ No maintenance burden - upstream changes don't break us
- ✅ Automatic support for new tools
- ✅ Automatic support for MCP Prompts
- ✅ ~150 lines of code eliminated
- ✅ No need to update tool schemas manually

**Option B: Hybrid Approach (If you need caching)**

Keep routing for tools that benefit from caching (like `fetch_scripture`), passthrough for everything else:

```typescript
private async routeToolCall(toolName: string, args: Record<string, any>) {
  const baseUrl = this.config.upstreamUrl.replace('/api/mcp', '');
  
  // Only route tools that benefit from direct REST access (caching, etc.)
  switch (toolName) {
    case 'fetch_scripture':
      // Direct REST endpoint for caching
      return {
        url: `${baseUrl}/api/fetch-scripture?${this.buildQueryString(args)}`,
        options: { method: 'GET', headers: this.getHeaders() }
      };
    
    default:
      // Everything else goes through MCP protocol
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
}
```

**Why Option A (Pure Passthrough) is better:**
- The upstream now supports MCP protocol at `/api/mcp`
- MCP `tools/call` method handles all tools internally
- No need to know individual REST endpoints
- Future-proof against upstream changes
- Supports new features (like Prompts) automatically

### Phase 2: Simplify Tool Registry (OPTIONAL)

**Option A: Dynamic Tool Discovery (Recommended)**

Instead of hardcoding tool schemas, fetch them from upstream:

```typescript
// In src/core/tool-registry.ts
export class ToolRegistry {
  private tools: Tool[] = [];
  
  async loadTools(upstreamClient: UpstreamClient): Promise<void> {
    // Fetch tools dynamically from upstream
    this.tools = await upstreamClient.listTools();
    logger.info(`Loaded ${this.tools.length} tools from upstream`);
  }
  
  getTools(): Tool[] {
    return this.tools;
  }
}
```

**Benefits:**
- ✅ No manual schema updates needed
- ✅ Automatically supports new tools
- ✅ Always in sync with upstream
- ✅ Eliminates ~200 lines of hardcoded schemas

**Option B: Keep Static Schemas (If you need offline support)**

Only update if you need the proxy to work without upstream connection:

1. Remove these tool schemas:
   - `get_translation_word` (renamed)
   - `get_context` (removed)
   - `browse_translation_words` (removed)
   - `extract_references` (removed)
   - `fetch_resources` (removed)
   - `get_words_for_reference` (removed)
   - `search_resources` (removed)
   - `get_languages` (removed)

2. Add these tool schemas:
   - `fetch_translation_word` (renamed from get_translation_word)
   - `fetch_translation_word_links` (new)
   - `fetch_translation_academy` (new)
   - `search_biblical_resources` (new)

3. Update tool count constant: `EXPECTED_TOOL_COUNT = 11`

**Recommendation:** Use Option A (Dynamic Discovery) - it's what we already do!

### Phase 3: Update Tests

**Changes needed:**

1. `tests/integration/upstream-connectivity.test.ts`:
   - Change expected tool count: 12 → 11
   - Update expected tool names list
   - Remove tests for deleted tools

2. `tests/integration/tool-calling.test.ts`:
   - Remove test cases for deleted tools
   - Update tool names in remaining tests
   - Add tests for new tools (optional)

3. `tests/integration/stdio-server/server.test.ts`:
   - Update tool name references
   - Remove tests that depend on deleted tools

### Phase 4: Update Client Methods (Optional)

**Changes needed in `src/core/index.ts`:**

The `TranslationHelpsClient` class has convenience methods that need updating:

```typescript
// REMOVE these methods (tools no longer exist):
- getContext()
- extractReferences()
- browseTranslationWords()
- getLanguages()
- fetchResources()
- getWordsForReference()
- searchResources()

// RENAME this method:
- getTranslationWord() → fetchTranslationWord()

// ADD these methods:
+ fetchTranslationWordLinks()
+ fetchTranslationAcademy()
+ searchBiblicalResources()
```

---

## 8. Migration Guide for Users

### 8.1 Tool Name Changes

If you're using these tools, update your code:

```typescript
// OLD
await client.callTool('get_translation_word', { reference: 'John 3:16' });

// NEW
await client.callTool('fetch_translation_word', { reference: 'John 3:16' });
```

### 8.2 Removed Tools

| Old Tool | Migration Path |
|----------|----------------|
| `get_context` | No replacement - feature removed |
| `browse_translation_words` | Use `fetch_translation_word` with search parameter |
| `extract_references` | No replacement - implement client-side |
| `fetch_resources` | Call individual fetch tools separately |
| `get_words_for_reference` | Use `fetch_translation_word_links` |
| `search_resources` | Use `search_biblical_resources` |
| `get_languages` | Use direct API call to `/api/simple-languages` |

### 8.3 New Features

```typescript
// Get word links for a passage
await client.callTool('fetch_translation_word_links', {
  reference: 'John 3:16',
  language: 'en'
});

// Get translation academy modules
await client.callTool('fetch_translation_academy', {
  moduleId: 'figs-metaphor',
  language: 'en'
});

// Search biblical resources with BM25
await client.callTool('search_biblical_resources', {
  query: 'love',
  language: 'en'
});
```

---

## 9. Risk Assessment

### 9.1 High Risk

- **Breaking Changes**: Users relying on removed tools will break
- **API Compatibility**: No backward compatibility provided by upstream
- **Test Coverage**: 21 tests failing indicates significant breakage

### 9.2 Medium Risk

- **Documentation Lag**: Our docs will be outdated until updated
- **Client Code**: Convenience methods in TranslationHelpsClient need updates
- **Type Definitions**: TypeScript types need updating

### 9.3 Low Risk

- **Core Functionality**: `fetch_scripture` still works
- **MCP Protocol**: Still supported, just tool names changed
- **Architecture**: Our proxy architecture is sound, just needs routing updates

---

## 10. Recommended Action Plan

### Immediate (This Sprint)

1. ✅ **Fix routing to use MCP protocol only** - Highest priority
2. ✅ **Update tool schemas** - Required for tests to pass
3. ✅ **Fix failing tests** - Update expectations and remove obsolete tests
4. ✅ **Update README** - Document breaking changes

### Short Term (Next Sprint)

1. **Add new tool support** - Implement new tools properly
2. **Update client methods** - Add convenience methods for new tools
3. **Migration guide** - Help users upgrade
4. **Version bump** - Major version (breaking changes)

### Long Term (Future)

1. **MCP Prompts support** - Add prompts capability
2. **Format support** - Support markdown format parameter
3. **Enhanced error handling** - Better error messages for removed tools
4. **Deprecation warnings** - Warn users about removed features

---

## 11. Files Requiring Changes

### Critical Files

1. **`src/core/upstream-client.ts`**
   - Line 60-100: `routeToolCall()` method
   - Remove all REST endpoint routing
   - Use MCP protocol for all tools

2. **`src/core/types.ts`**
   - Lines with tool schema definitions
   - Remove 8 old schemas, add 4 new schemas
   - Update EXPECTED_TOOL_COUNT

3. **`src/core/index.ts`**
   - TranslationHelpsClient class methods
   - Remove/rename/add methods to match new tools

### Test Files

4. **`tests/integration/upstream-connectivity.test.ts`**
   - Line 44: Change expected count 12 → 11
   - Line 123: Update expected tool names

5. **`tests/integration/tool-calling.test.ts`**
   - Remove test blocks for deleted tools
   - Update tool names in remaining tests

6. **`tests/integration/stdio-server/server.test.ts`**
   - Update tool name references
   - Remove tests for deleted tools

### Documentation Files

7. **`README.md`**
   - Update tool list
   - Add breaking changes notice
   - Update examples

8. **`ARCHITECTURE.md`**
   - Update tool schemas section
   - Update tool count
   - Document changes

9. **`CHANGELOG.md`** (create if doesn't exist)
   - Document breaking changes
   - Migration guide

---

## 12. Testing Strategy

### Unit Tests
- ✅ Most unit tests should still pass (they test internal logic)
- Update tool name constants

### Integration Tests
- ❌ 21 tests currently failing
- Fix by updating tool names and removing obsolete tests
- Add tests for new tools

### E2E Tests
- ⚠️ May need updates if they use removed tools
- Test full workflows with new tool names

### Manual Testing
- Test against live upstream at `https://translation-helps-mcp.pages.dev`
- Verify all 11 tools work via MCP protocol
- Test error handling for removed tools

---

## 13. Conclusion

The upstream service has undergone a major refactoring that breaks our proxy's compatibility. The good news is that the fix is straightforward:

1. **Switch to MCP-only routing** - Stop using REST endpoints
2. **Update tool schemas** - Match the new 11-tool list
3. **Update tests** - Remove obsolete tests, fix expectations

The changes are breaking but manageable. The upstream's move to a unified architecture is actually beneficial long-term, as it simplifies our routing logic. Instead of maintaining mappings to individual REST endpoints, we can now route everything through the MCP protocol.

**Estimated effort:** 2-3 days for core fixes + testing

**Recommended approach:** Fix routing first (gets tests passing), then update schemas and client methods, then documentation.

---

## Appendix A: Tool Comparison Matrix

| Tool Name (Old) | Tool Name (New) | Status | Endpoint (Old) | Endpoint (New) |
|----------------|----------------|--------|----------------|----------------|
| fetch_scripture | fetch_scripture | ✅ Same | /api/fetch-scripture | MCP only |
| fetch_translation_notes | fetch_translation_notes | ⚠️ Changed | /api/translation-notes | MCP only |
| fetch_translation_questions | fetch_translation_questions | ⚠️ Changed | /api/translation-questions | MCP only |
| get_translation_word | fetch_translation_word | 🔄 Renamed | /api/fetch-translation-words | MCP only |
| get_context | ❌ REMOVED | ❌ Gone | /api/get-context | N/A |
| get_languages | ❌ REMOVED | ❌ Gone | /api/get-languages | /api/simple-languages |
| browse_translation_words | ❌ REMOVED | ❌ Gone | /api/browse-translation-words | N/A |
| extract_references | ❌ REMOVED | ❌ Gone | /api/extract-references | N/A |
| fetch_resources | ❌ REMOVED | ❌ Gone | /api/fetch-resources | N/A |
| get_words_for_reference | ❌ REMOVED | ❌ Gone | /api/get-words-for-reference | N/A |
| search_resources | ❌ REMOVED | ❌ Gone | /api/search-resources | N/A |
| N/A | fetch_translation_word_links | 🆕 NEW | N/A | MCP only |
| N/A | fetch_translation_academy | 🆕 NEW | N/A | MCP only |
| N/A | search_biblical_resources | 🆕 NEW | N/A | MCP only |

---

## Appendix B: Upstream README Excerpts

Key sections from the updated upstream README:

### Breaking Changes (from v6.6.3)

> **Removed Endpoints:**
> - `/api/fetch-ult-scripture` → Use `fetch-scripture?resource=ult`
> - `/api/fetch-ust-scripture` → Use `fetch-scripture?resource=ust`
> - `/api/fetch-resources` → Use specific endpoints
> - `/api/resource-recommendations` → Removed completely
> - `/api/language-coverage` → Removed completely
> - `/api/get-words-for-reference` → Use `fetch-translation-words`

### Architecture (from v6.6.3)

> All endpoints use the same architecture:
> ```
> API Endpoint → createSimpleEndpoint → UnifiedResourceFetcher → ZipResourceFetcher2 → DCS
> ```

---

**End of Analysis**