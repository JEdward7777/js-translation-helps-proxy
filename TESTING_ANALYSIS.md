# Testing Analysis: Mocks vs Real Upstream Server

## Original Question
"Can you tell me why the tests are using mocks? Do they have to? Could they be removed and just have the upstream MCP server respond as part of the testing?"

## Answer: No, They Don't Have To Use Mocks

### Current Test Structure

The project now has **three types of tests**:

1. **Unit Tests** (65 tests) - Use mocks ✅ **Should stay mocked**
   - Located in: `tests/unit/`
   - Purpose: Test individual components in isolation
   - Fast execution (< 1 second)
   - No network dependencies
   - Test edge cases and error handling

2. **Integration Tests** (22 tests) - Use real server ✅ **Now working!**
   - Located in: `tests/integration/`
   - Purpose: Test actual communication with upstream MCP server
   - Connect to: `https://translation-helps-mcp.pages.dev/api/mcp`
   - Verify real API responses
   - Test Results: **20 passing, 2 failing** (upstream server bugs)

3. **E2E Tests** - Use real server ✅ **Created**
   - Located in: `tests/e2e/`
   - Purpose: Test complete workflows end-to-end
   - Test filtering, configuration, and full scenarios

### Why Unit Tests Should Stay Mocked

Unit tests **should** use mocks because:
- **Speed**: Run in milliseconds vs seconds
- **Reliability**: Don't depend on network/external services
- **Isolation**: Test specific code paths and edge cases
- **CI/CD**: Can run offline without API keys or network access
- **Determinism**: Same results every time

### Why Integration Tests Should Use Real Server

Integration tests **should** use the real server because:
- **Validation**: Confirm the proxy actually works with the real API
- **API Changes**: Detect when upstream API changes
- **Routing Logic**: Verify non-standard endpoint routing works correctly
- **Real Data**: Test with actual scripture, notes, and translation data
- **Confidence**: Prove the system works end-to-end

## Test Results

### Unit Tests: ✅ All 65 Passing
```bash
npm run test:unit
# Fast, reliable, no network needed
```

### Integration Tests: ⚠️ 20/22 Passing
```bash
npm run test:integration
# Connects to real upstream server
# 2 failures are upstream server bugs (browse_translation_words returns 500)
```

Successful tool calls:
- ✅ fetch_scripture
- ✅ fetch_translation_notes  
- ✅ fetch_translation_questions
- ✅ get_translation_word
- ✅ get_context
- ✅ extract_references
- ❌ browse_translation_words (upstream server bug - returns 500)

### Upstream Server Bug Found

The `browse_translation_words` endpoint at the upstream server returns HTTP 500.

**Direct curl test confirms the bug:**
```bash
$ curl -s "https://translation-helps-mcp.pages.dev/api/browse-translation-words?language=en"
{
  "error": "An unexpected error occurred. Please try again later.",
  "details": {
    "endpoint": "browse-translation-words-v2",
    "path": "/api/browse-translation-words",
    "params": {
      "language": "en",
      "organization": "unfoldingWord",
      "category": "all",
      "format": "json"
    },
    "timestamp": "2025-11-11T21:13:46.592Z"
  },
  "status": 500
}
```

**Comparison with working endpoint:**
```bash
$ curl -s "https://translation-helps-mcp.pages.dev/api/fetch-scripture?reference=John%203:16"
# Returns 200 OK with scripture data
```

This is **not** a bug in our proxy - it's a bug in the upstream Translation Helps API itself.

**Important Discovery**: The Python proxy tests also **do not test** `browse_translation_words`. Looking at the Python test files:
- `test_tool_execution.py` - Only tests `get_system_prompt` and `fetch_scripture`
- `test_upstream_connectivity.py` - Only tests connectivity and tool discovery
- No tests exist for `browse_translation_words`

This means:
1. ✅ The bug exists in the upstream server (confirmed via direct curl)
2. ✅ Neither Python nor TypeScript tests caught it before
3. ✅ Our new TypeScript integration tests are **more comprehensive** than the Python tests
4. ✅ We discovered a real bug that was previously unknown

## Configuration

### Environment Variables
```bash
# .env file (optional)
UPSTREAM_MCP_URL=https://translation-helps-mcp.pages.dev/api/mcp
```

### Running Tests
```bash
# Run all tests
npm test

# Run only unit tests (fast, mocked)
npm run test:unit

# Run only integration tests (slow, real server)
npm run test:integration

# Run only e2e tests (slow, real server)
npm run test:e2e

# Run all tests together
npm run test:all
```

## Recommendations

### For Development
1. **Use unit tests** for rapid iteration and TDD
2. **Use integration tests** before committing to verify real API compatibility
3. **Use e2e tests** to validate complete workflows

### For CI/CD
1. **Always run unit tests** (fast, reliable)
2. **Run integration tests** on main branch or before releases
3. **Monitor integration test failures** - they indicate upstream API issues

### For Debugging
1. Unit tests help isolate logic bugs
2. Integration tests help identify API compatibility issues
3. E2E tests help validate user workflows

## Conclusion

**The tests don't have to use mocks** - we've successfully created integration and e2e tests that connect to the real upstream MCP server. However, **unit tests should remain mocked** for speed and reliability, while **integration/e2e tests should use the real server** for validation.

The best practice is to have **both**:
- Fast, mocked unit tests for development
- Slower, real integration tests for validation

This gives you the best of both worlds: rapid feedback during development and confidence that the system works with the real API.