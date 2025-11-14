# Upstream Response Handling Refactor Plan

## Problem Statement

The current codebase has significant issues with upstream response handling that need to be addressed:

### Problem 1: `filterBookChapterNotes` Doesn't Work

**Location:** [`src/core/index.ts:104-113`](../src/core/index.ts:104)

```typescript
// Call upstream
const rawResponse = await this.upstreamClient.callTool(name, args);

// Apply response filtering
const filteredResponse = this.filterEngine.filterBookChapterNotes(rawResponse);

// Format response
const formattedResult = ResponseFormatter.formatResponse(filteredResponse);
```

**The Issue:**
1. Line 107: `filterBookChapterNotes()` is called on the raw response from upstream
2. Line 110: `ResponseFormatter.formatResponse()` converts the entire response to text strings
3. **Result:** The filter can't access the structured `items` array because it's already been converted to a text string

**Why It Fails:**
- `filterBookChapterNotes()` expects `response.items` to be an array (see [`src/core/filter-engine.ts:77`](../src/core/filter-engine.ts:77))
- But `ResponseFormatter.formatResponse()` has already converted everything to `TextContent[]` with a single text string
- The structured data is lost before filtering can happen

### Problem 2: Duplicate Response Formatting Logic

**Two nearly identical implementations:**

1. **[`UpstreamClient.formatResponse()`](../src/core/upstream-client.ts:232)** (lines 232-317)
2. **[`ResponseFormatter.formatResponse()`](../src/core/response-formatter.ts:14)** (lines 14-62)

**The Issue:**
- Both contain ~85 lines of nearly identical code
- Both guess at response formats with multiple conditional checks
- Lots of entropy: checking for `notes`, `verseNotes`, `items`, `scripture`, `words`, `questions`, etc.
- No ground truth about what the upstream API actually returns
- Maintenance nightmare: changes must be made in two places

**Example of Guessing Logic:**
```typescript
// Translation notes format
if ('notes' in response || 'verseNotes' in response || 'items' in response) {
  const notes = response.notes || response.verseNotes || response.items;
  // ... more guessing
}
```

### Problem 3: No Validation Against Real Responses

- No saved examples of actual upstream responses
- Can't verify if our parsing logic matches reality
- Can't detect when upstream API changes
- Testing relies on mocked data that may not match real responses

---

## Proposed Solution

### Step 1: Create Upstream Response Capture Tool

**Goal:** Fetch real responses from the upstream API and save them as reference files.

**Implementation:**
- Create `scripts/fetch-upstream-responses.ts`
- For each tool, call the upstream API with realistic test data
- Save raw JSON responses to `test-data/upstream-responses/`
- One file per tool (e.g., `fetch_scripture.json`, `fetch_translation_notes.json`)

**Test Data to Use:**
```typescript
const testCases = {
  fetch_scripture: {
    reference: 'John 3:16',
    language: 'en',
    organization: 'unfoldingWord'
  },
  fetch_translation_notes: {
    reference: 'John 3:16',
    language: 'en',
    organization: 'unfoldingWord'
  },
  fetch_translation_questions: {
    reference: 'John 3:16',
    language: 'en',
    organization: 'unfoldingWord'
  },
  get_translation_word: {
    reference: 'John 3:16',
    wordId: 'believe',
    language: 'en',
    organization: 'unfoldingWord'
  },
  browse_translation_words: {
    language: 'en',
    organization: 'unfoldingWord',
    limit: 10
  },
  get_context: {
    reference: 'John 3:16',
    language: 'en',
    organization: 'unfoldingWord'
  },
  extract_references: {
    text: 'See John 3:16 and Romans 8:28',
    includeContext: true
  }
};
```

**Output Structure:**
```
test-data/
├── upstream-responses/
│   ├── fetch_scripture.json
│   ├── fetch_translation_notes.json
│   ├── fetch_translation_questions.json
│   ├── get_translation_word.json
│   ├── browse_translation_words.json
│   ├── get_context.json
│   ├── extract_references.json
│   └── README.md
└── README.md
```

### Step 2: Save Responses as Reference Files

**Benefits:**
- Ground truth for actual upstream response formats
- Can be checked into git for version control
- Can diff changes when upstream API updates
- Useful for testing and validation
- Documentation of API behavior

**File Format:**
```json
{
  "tool": "fetch_scripture",
  "timestamp": "2025-11-14T22:00:00.000Z",
  "request": {
    "reference": "John 3:16",
    "language": "en",
    "organization": "unfoldingWord"
  },
  "response": {
    // Actual upstream response here
  }
}
```

### Step 3: Refactor Response Handling

**Changes Required:**

#### 3.1: Remove Duplicate `formatResponse()` from `UpstreamClient`

**File:** [`src/core/upstream-client.ts`](../src/core/upstream-client.ts)

- Remove `formatResponse()` method (lines 232-317)
- Have `callTool()` return the raw response directly
- Let the caller handle formatting

**Before:**
```typescript
async callTool(name: string, args: Record<string, any>): Promise<ToolResult> {
  const response = await this.callUpstream('tools/call', { name, arguments: args });
  return this.formatResponse(response); // ❌ Remove this
}
```

**After:**
```typescript
async callTool(name: string, args: Record<string, any>): Promise<UpstreamResponse> {
  const response = await this.callUpstream('tools/call', { name, arguments: args });
  return response; // ✅ Return raw response
}
```

#### 3.2: Fix Order of Operations in `TranslationHelpsClient`

**File:** [`src/core/index.ts`](../src/core/index.ts)

**Current (Broken):**
```typescript
// Call upstream
const rawResponse = await this.upstreamClient.callTool(name, args);

// Apply response filtering (❌ Works on raw response)
const filteredResponse = this.filterEngine.filterBookChapterNotes(rawResponse);

// Format response (❌ Converts to text, loses structure)
const formattedResult = ResponseFormatter.formatResponse(filteredResponse);
```

**Fixed:**
```typescript
// Call upstream (returns raw response now)
const rawResponse = await this.upstreamClient.callTool(name, args);

// Apply response filtering BEFORE formatting (✅ Works on structured data)
const filteredResponse = this.filterEngine.filterBookChapterNotes(rawResponse);

// Format response AFTER filtering (✅ Converts filtered structured data to text)
const formattedResult = ResponseFormatter.formatResponse(filteredResponse);
```

#### 3.3: Update `ResponseFormatter` Based on Real Data

**File:** [`src/core/response-formatter.ts`](../src/core/response-formatter.ts)

- Review saved upstream responses
- Remove guessing logic
- Implement precise parsing based on actual response formats
- Add comments documenting the actual structure

**Example - Before (Guessing):**
```typescript
// Translation notes format
if ('notes' in response || 'verseNotes' in response || 'items' in response) {
  const notes = response.notes || response.verseNotes || response.items;
  // ...
}
```

**Example - After (Precise):**
```typescript
// Translation notes format (upstream returns 'items' array)
// See test-data/upstream-responses/fetch_translation_notes.json
if ('items' in response && Array.isArray(response.items)) {
  return this.formatNotes(response, response.items);
}
```

### Step 4: Document the Process

**Create Documentation:**

1. **`test-data/README.md`** - Overview of test data structure
2. **`test-data/upstream-responses/README.md`** - How to use the capture tool
3. **Update `docs/ARCHITECTURE.md`** - Document the response handling flow
4. **Update this file** - Mark as completed with results

**Documentation Should Include:**
- How to run the capture tool
- When to re-run it (e.g., when upstream API changes)
- How to interpret the saved responses
- How to update response formatting logic

---

## Implementation Checklist

### Phase 1: Capture Tool
- [ ] Create `scripts/fetch-upstream-responses.ts`
- [ ] Implement test cases for all tools
- [ ] Add error handling and logging
- [ ] Create `test-data/upstream-responses/` directory
- [ ] Run tool and save responses
- [ ] Create `test-data/upstream-responses/README.md`

### Phase 2: Refactor Response Handling
- [ ] Remove `formatResponse()` from `UpstreamClient`
- [ ] Update `UpstreamClient.callTool()` to return raw response
- [ ] Fix order in `TranslationHelpsClient.callTool()`
- [ ] Update `ResponseFormatter` based on real data
- [ ] Remove guessing logic, add precise parsing
- [ ] Add comments documenting actual structures

### Phase 3: Testing & Validation
- [ ] Update unit tests for `UpstreamClient`
- [ ] Update unit tests for `ResponseFormatter`
- [ ] Update integration tests
- [ ] Verify `filterBookChapterNotes` now works
- [ ] Test all tools end-to-end

### Phase 4: Documentation
- [ ] Create `test-data/README.md`
- [ ] Update `docs/ARCHITECTURE.md`
- [ ] Add usage instructions to this file
- [ ] Update `CHANGELOG.md`

---

## Expected Benefits

1. **Eliminates Guessing:** Response handling based on real data, not assumptions
2. **Fixes Filtering:** `filterBookChapterNotes` will work correctly
3. **Reduces Duplication:** Single source of truth for response formatting
4. **Improves Maintainability:** Changes only needed in one place
5. **Enables Validation:** Can detect upstream API changes automatically
6. **Better Testing:** Tests can use real response examples
7. **Documentation:** Saved responses serve as API documentation

---

## Future Enhancements

1. **Automated Validation:** Add tests that compare live responses to saved ones
2. **CI Integration:** Run capture tool in CI to detect API changes
3. **Response Versioning:** Track changes to upstream API over time
4. **Schema Generation:** Auto-generate TypeScript types from responses
5. **Diff Tool:** Compare current responses to saved ones and highlight changes

---

## Notes

- The upstream URL is: `https://translation-helps-mcp.pages.dev/api/mcp`
- All tools should use realistic Bible references (e.g., John 3:16, Genesis 1:1)
- Save responses with timestamps to track when they were captured
- Consider adding multiple examples per tool (different references, edge cases)

---

**Status:** 📝 Planning Phase  
**Created:** 2025-11-14  
**Last Updated:** 2025-11-14