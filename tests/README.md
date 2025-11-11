# Test Suite Documentation

This directory contains the test suite for the js-translation-helps-proxy project, organized into three categories: unit tests, integration tests, and end-to-end (e2e) tests.

## Test Structure

```
tests/
├── unit/           # Unit tests with mocks (fast, isolated)
├── integration/    # Integration tests with real upstream server
├── e2e/           # End-to-end workflow tests
└── README.md      # This file
```

## Test Types

### Unit Tests (`tests/unit/`)

Unit tests use mocks to test individual components in isolation. They are:
- **Fast**: Run in milliseconds
- **Isolated**: No external dependencies
- **Deterministic**: Always produce the same results
- **Comprehensive**: Test edge cases and error conditions

**Files:**
- `core/upstream-client.test.ts` - Tests HTTP client routing and error handling
- `core/translation-helps-client.test.ts` - Tests client orchestration logic
- `core/filter-engine.test.ts` - Tests tool and parameter filtering
- `core/response-formatter.test.ts` - Tests response formatting logic

**Run unit tests:**
```bash
npm run test:unit
```

### Integration Tests (`tests/integration/`)

Integration tests connect to the real upstream MCP server to verify actual functionality. They:
- **Test real connectivity**: Verify the proxy works with the actual upstream server
- **Validate tool calls**: Ensure tools return expected data formats
- **Check error handling**: Test how the system handles real-world errors

**Files:**
- `upstream-connectivity.test.ts` - Tests connection and tool discovery
- `tool-calling.test.ts` - Tests actual tool invocations with real data

**Run integration tests:**
```bash
npm run test:integration
```

**Requirements:**
- Network connectivity
- Access to upstream MCP server (default: https://translation-helps.door43.org/api/mcp)
- Longer timeout (30 seconds per test)

### End-to-End Tests (`tests/e2e/`)

E2E tests verify complete workflows from start to finish, including:
- **Full feature workflows**: Test complete user scenarios
- **Configuration changes**: Verify dynamic configuration updates
- **Filtering and formatting**: Test the full stack with all features enabled

**Files:**
- `full-workflow.test.ts` - Tests complete workflows with all features

**Run e2e tests:**
```bash
npm run test:e2e
```

## Running Tests

### Run all tests
```bash
npm test              # Run all tests in watch mode
npm run test:all      # Run all tests once
```

### Run specific test types
```bash
npm run test:unit         # Unit tests only (fast)
npm run test:integration  # Integration tests only (requires network)
npm run test:e2e          # E2E tests only (requires network)
```

### Watch mode (for development)
```bash
npm run test:watch    # Watch unit tests for changes
```

## Configuration

### Environment Variables

You can configure the upstream server URL for integration and e2e tests:

```bash
# Set custom upstream URL
export UPSTREAM_MCP_URL=https://your-custom-server.com/api/mcp

# Run integration tests with custom URL
npm run test:integration
```

**Default upstream URL:** `https://translation-helps.door43.org/api/mcp`

### Test Timeouts

- **Unit tests**: 5 seconds (default)
- **Integration tests**: 30 seconds
- **E2E tests**: 60 seconds (for complex workflows)

Timeouts are configured in [`vitest.config.ts`](../vitest.config.ts).

## Why Both Mocks and Real Tests?

### Unit Tests with Mocks
- ✅ Fast feedback during development
- ✅ Test edge cases that are hard to reproduce
- ✅ No external dependencies
- ✅ Test error conditions reliably
- ✅ Run in CI/CD without network access

### Integration/E2E Tests with Real Server
- ✅ Verify actual API compatibility
- ✅ Catch real-world issues
- ✅ Validate data formats from upstream
- ✅ Test network error handling
- ✅ Ensure end-to-end functionality

**Best Practice:** Run unit tests frequently during development, and run integration/e2e tests before commits or in CI/CD pipelines.

## Writing New Tests

### Adding a Unit Test

1. Create test file in `tests/unit/`
2. Mock external dependencies
3. Test component logic in isolation
4. Use descriptive test names

Example:
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('MyComponent', () => {
  it('should do something specific', () => {
    // Test implementation
  });
});
```

### Adding an Integration Test

1. Create test file in `tests/integration/`
2. Use real UpstreamClient or TranslationHelpsClient
3. Set appropriate timeout (30000ms)
4. Test actual API responses

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { UpstreamClient } from '../../src/core/upstream-client.js';

describe('Feature (Integration)', () => {
  it('should work with real upstream', async () => {
    const client = new UpstreamClient({
      upstreamUrl: process.env.UPSTREAM_MCP_URL || 'https://...'
    });
    // Test with real API
  }, 30000);
});
```

### Adding an E2E Test

1. Create test file in `tests/e2e/`
2. Test complete workflows
3. Set longer timeout (60000ms)
4. Include multiple steps with logging

Example:
```typescript
describe('Complete Workflow (E2E)', () => {
  it('should complete full user scenario', async () => {
    console.log('Step 1: ...');
    // Step 1
    console.log('Step 2: ...');
    // Step 2
  }, 60000);
});
```

## Continuous Integration

For CI/CD pipelines:

```bash
# Run only unit tests (fast, no network required)
npm run test:unit

# Run all tests including integration (requires network)
npm run test:all
```

Consider running integration/e2e tests:
- On pull requests
- Before deployments
- On a schedule (nightly builds)
- When upstream API changes

## Troubleshooting

### Integration tests failing

1. **Check network connectivity**
   ```bash
   curl https://translation-helps.door43.org/api/mcp?method=tools/list
   ```

2. **Verify upstream URL**
   ```bash
   echo $UPSTREAM_MCP_URL
   ```

3. **Check timeout settings** - Increase if tests are timing out

### Tests timing out

- Increase timeout in test file: `it('test', async () => { ... }, 60000)`
- Check network speed
- Verify upstream server is responding

### Mock issues in unit tests

- Ensure mocks are cleared: `vi.clearAllMocks()` in `beforeEach`
- Verify mock implementations match actual interfaces
- Check that mocks are properly imported

## Coverage

Generate test coverage report:

```bash
npm test -- --coverage
```

Coverage reports are generated in the `coverage/` directory.

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Project Architecture](../ARCHITECTURE.md)