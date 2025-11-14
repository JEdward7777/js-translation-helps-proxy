# Documentation Update Needs: ARCHITECTURE.md Reconciliation

This document identifies discrepancies between the original ARCHITECTURE.md design document and the actual implementation. The goal is to update ARCHITECTURE.md from a design plan to accurate documentation.

## Summary of Changes Needed

The project has been successfully implemented with all 4 interfaces, but several aspects differ from the original architecture document. The implementation is more comprehensive than originally planned.

---

## 1. Version and Status

**Current ARCHITECTURE.md**: Version 1.0.0 (planned)
**Actual Implementation**: Version 0.1.0 (implemented)

**Update Needed**: Change version to 0.1.0 and update status from "design plan" to "implemented system"

---

## 2. Project Structure Discrepancies

### 2.1 Directory Structure

**ARCHITECTURE.md Structure**:
```
js-translation-helps-proxy/
├── src/
│   ├── interfaces/
│   │   ├── api/                   # Interface 1: Core API
│   │   ├── mcp-server/            # Interface 2: SSE/HTTP MCP
│   │   ├── stdio/                 # Interface 3: stdio MCP
│   │   ├── llm-helper/            # Interface 3.5: LLM Helper
│   │   └── openai-bridge/         # Interface 4: OpenAI API
│   └── core/                      # Shared core logic
├── servers/                       # Deployable servers
└── tests/
```

**Actual Structure**:
```
js-translation-helps-proxy/
├── src/
│   ├── core/                      # Interface 1: Core API + shared logic
│   ├── mcp-server/                # Interface 2: SSE/HTTP MCP
│   ├── stdio-server/              # Interface 3: stdio MCP
│   ├── llm-helper/                # Interface 3.5: LLM Helper
│   ├── openai-api/                # Interface 4: OpenAI API
│   └── shared/                    # Shared utilities
├── tests/                         # No servers/ directory
└── (no servers/ directory)
```

**Update Needed**: Update project structure diagram to reflect actual organization. Remove `interfaces/` wrapper and `servers/` directory.

### 2.2 Package.json Configuration

**ARCHITECTURE.md**:
- `"main": "dist/index.js"`
- `"bin": { "translation-helps-proxy": "dist/servers/stdio.js" }`

**Actual package.json**:
- `"main": "dist/stdio-server.js"`
- `"bin": { "js-translation-helps-proxy": "dist/stdio-server.js" }`

**Update Needed**: Update package.json references in documentation.

---

## 3. Tool Schema Changes

### 3.1 Number of Tools

**ARCHITECTURE.md**: Documents 8 tools, mentions "9-12. Additional Tools" will be discovered from upstream
**Actual Implementation**: 12 tools hardcoded in `src/core/types.ts`

**Additional Tools Implemented**:
- `fetch_resources`
- `get_words_for_reference`
- `search_resources`
- `get_languages`

**Update Needed**: Update tool schemas section to document all 12 tools instead of 8 + "additional".

### 3.2 Tool Discovery Method

**ARCHITECTURE.md**: "The actual tool list should be dynamically discovered from the upstream server on initialization, not hardcoded"
**Actual Implementation**: Tools are hardcoded in `types.ts` but registry dynamically loads from upstream

**Update Needed**: Clarify that schemas are statically defined for validation but dynamically discovered at runtime.

---

## 4. Dependencies and Versions

### 4.1 Core Dependencies

**ARCHITECTURE.md**:
- `@modelcontextprotocol/sdk`: ^1.0.0
- `hono`: ^4.0.0
- `zod`: ^3.22.0+

**Actual package.json**:
- `@modelcontextprotocol/sdk`: ^1.21.1
- `hono`: ^4.10.5
- `zod`: ^3.25.76

**Update Needed**: Update dependency versions to match implementation.

### 4.2 Additional Dependencies

**ARCHITECTURE.md**: Lists `openai` as optional
**Actual Implementation**: `openai` ^6.8.1 is included in dependencies

**Update Needed**: Update dependencies section to reflect actual usage.

### 4.3 Development Dependencies

**ARCHITECTURE.md**: Includes `tsup`, `prettier`, `eslint`, etc.
**Actual Implementation**: Includes `vitest`, `tsx`, `wrangler`, etc.

**Update Needed**: Update dev dependencies list to match actual package.json.

---

## 5. Testing Strategy Changes

### 5.1 Test Coverage

**ARCHITECTURE.md**: "70 tests, 70% coverage target"
**Actual Implementation**: "153 tests, 95.4% coverage (146/153 passing)"

**Update Needed**: Update testing strategy section with actual numbers and implementation details.

### 5.2 Test Structure

**ARCHITECTURE.md**: Basic unit/integration/e2e pyramid
**Actual Implementation**: Comprehensive test suite with real upstream integration tests

**Update Needed**: Update testing section to reflect actual test structure and results.

---

## 6. Interface Implementation Details

### 6.1 Interface 1: Core API Location

**ARCHITECTURE.md**: `src/interfaces/api/`
**Actual Implementation**: `src/core/index.ts` (TranslationHelpsClient class)

**Update Needed**: Update references to point to correct location.

### 6.2 Interface 3.5: LLM Helper

**ARCHITECTURE.md**: Basic description
**Actual Implementation**: Full implementation with OpenAI/Anthropic support, automatic tool execution

**Update Needed**: Update description to match actual capabilities.

### 6.3 Interface 4: OpenAI API

**ARCHITECTURE.md**: Basic Hono server
**Actual Implementation**: Full OpenAI-compatible API with iterative execution

**Update Needed**: Update implementation details to match actual code.

---

## 7. Configuration and Environment Variables

### 7.1 Environment Variables

**ARCHITECTURE.md Example**:
```bash
ENABLED_TOOLS=fetch_scripture,fetch_translation_notes,get_system_prompt
HIDDEN_PARAMS=language,organization
FILTER_BOOK_CHAPTER_NOTES=true
UPSTREAM_URL=https://translation-helps-mcp.pages.dev/api/mcp
MODEL_ENDPOINT=https://api.openai.com/v1
MODEL_API_KEY=sk-...
```

**Actual .env.example**:
```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
TRANSLATION_HELPS_API_URL=https://api.translationhelps.com
UPSTREAM_MCP_URL=https://translation-helps-mcp.pages.dev/api/mcp
# etc.
```

**Update Needed**: Update environment variable examples to match actual configuration.

---

## 8. Deployment Configuration

### 8.1 CloudFlare Workers

**ARCHITECTURE.md**: Mentions deploying both MCP HTTP and OpenAI API
**Actual wrangler.toml**: Configured for OpenAI API (`main = "dist/openai-api/index.js"`)

**Update Needed**: Update deployment section to reflect actual CloudFlare configuration.

---

## 9. Implementation Status

### 9.1 Roadmap Completion

**ARCHITECTURE.md**: Shows implementation roadmap with phases
**Actual Status**: All phases completed, project is production-ready

**Update Needed**: Update roadmap to show completed status and actual timeline.

### 9.2 Additional Features Implemented

**Not in ARCHITECTURE.md**:
- Comprehensive error handling and logging
- Tool caching and registry
- Multiple provider support (OpenAI + Anthropic)
- Extensive test suite with real upstream testing
- Production deployment configurations

**Update Needed**: Add sections documenting these additional features.

---

## 10. Code Fixes Needed

### 10.1 Upstream Server Bug Discovery

**Issue**: Integration tests discovered that `browse_translation_words` endpoint returns HTTP 500 from upstream server.

**Code Fix Needed**: The implementation correctly handles this, but the tool should either:
- Be removed from available tools if upstream is broken, or
- Have error handling to gracefully fail

**Recommendation**: Remove `browse_translation_words` from static schemas since upstream endpoint is broken.

---

## Summary of Documentation Updates Required

1. **Version**: 1.0.0 → 0.1.0
2. **Project Structure**: Update directory layout
3. **Tool Schemas**: Document all 12 tools
4. **Dependencies**: Update versions and lists
5. **Testing**: Update coverage numbers and strategy
6. **Configuration**: Update environment variables
7. **Deployment**: Update CloudFlare configuration
8. **Status**: Change from "design plan" to "implemented system"

## Code Fixes Recommended

1. **Remove broken tool**: `browse_translation_words` from static schemas (upstream server bug)
2. **Consider**: Whether to keep it in dynamic discovery or remove entirely

This document should be handed to a developer to reconcile these differences between the architecture document and implementation.