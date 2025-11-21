# Contributing to JS Translation Helps Proxy

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Documentation](#documentation)
- [Release Process](#release-process)

---

## Code of Conduct

This project follows a code of conduct to ensure a welcoming environment for all contributors:

- **Be respectful** and considerate in all interactions
- **Be collaborative** and help others learn
- **Be patient** with new contributors
- **Focus on what is best** for the community
- **Show empathy** towards other community members

---

## Getting Started

### Prerequisites

- **Node.js** >= 20.17.0
- **npm** or **yarn**
- **Git**
- **Code editor** (VS Code recommended)

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/js-translation-helps-proxy.git
   cd js-translation-helps-proxy
   ```
3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/js-translation-helps-proxy.git
   ```

---

## Development Setup

### Install Dependencies

```bash
npm install
```

### Environment Configuration

Create a `.env` file for local development (already in `.gitignore`):

```bash
# .env file (DO NOT COMMIT)

# Upstream server
UPSTREAM_MCP_URL=https://translation-helps-mcp.pages.dev/api/mcp
TIMEOUT=30000
LOG_LEVEL=debug

# For LLM Helper tests (optional)
OPENAI_API_KEY=your-openai-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here
```

### Build the Project

```bash
npm run build
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode for development
npm run test:watch
```

### Start Development Server

```bash
# stdio server with hot reload
npm run dev

# HTTP server with hot reload
npm run dev:http
```

---

## Project Structure

```
js-translation-helps-proxy/
├── src/
│   ├── core/              # Interface 1: Core API
│   │   ├── index.ts       # Main client
│   │   ├── upstream-client.ts
│   │   ├── filter-engine.ts
│   │   ├── response-formatter.ts
│   │   └── types.ts
│   ├── mcp-server/        # Interface 2: MCP HTTP Server
│   │   ├── index.ts
│   │   ├── server.ts
│   │   └── routes.ts
│   ├── stdio-server/      # Interface 3: stdio Server
│   │   └── index.ts
│   ├── llm-helper/        # Interface 3.5: LLM Helper
│   │   ├── index.ts
│   │   ├── llm-client.ts
│   │   └── tool-executor.ts
│   ├── openai-api/        # Interface 4: OpenAI API
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── tool-mapper.ts
│   └── shared/            # Shared utilities
│       ├── logger.ts
│       └── errors.ts
├── tests/
│   ├── unit/              # Unit tests (mocked)
│   ├── integration/       # Integration tests (real server)
│   └── e2e/               # End-to-end tests
├── docs/                  # Documentation
├── examples/              # Example configurations
└── dist/                  # Build output (gitignored)
```

### Key Files

- **`src/core/index.ts`** - Main TranslationHelpsClient
- **`src/stdio-server/index.ts`** - stdio MCP server entry point
- **`src/mcp-server/index.ts`** - HTTP MCP server entry point
- **`src/openai-api/index.ts`** - OpenAI API entry point
- **`wrangler.toml`** - CloudFlare Workers configuration
- **`tsconfig.json`** - TypeScript configuration
- **`vitest.config.ts`** - Test configuration

---

## Coding Standards

### TypeScript

- Use **TypeScript** for all source code
- Enable **strict mode** in `tsconfig.json`
- Provide **type annotations** for public APIs
- Use **interfaces** for object shapes
- Use **enums** for constants
- Avoid `any` type unless absolutely necessary

### Code Style

We use **ESLint** and **Prettier** for code formatting:

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Naming Conventions

- **Files:** `kebab-case.ts` (e.g., `upstream-client.ts`)
- **Classes:** `PascalCase` (e.g., `TranslationHelpsClient`)
- **Functions:** `camelCase` (e.g., `fetchScripture`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `DEFAULT_TIMEOUT`)
- **Interfaces:** `PascalCase` (e.g., `ToolConfig`)
- **Types:** `PascalCase` (e.g., `ToolName`)

### Code Organization

- **One class per file** (except small helper classes)
- **Export public APIs** from `index.ts`
- **Keep functions small** and focused
- **Use meaningful names** that describe intent
- **Add comments** for complex logic
- **Document public APIs** with JSDoc

### Example Code Style

```typescript
/**
 * Fetches scripture text for a given reference.
 * 
 * @param args - The scripture fetch arguments
 * @returns Promise resolving to scripture content
 * @throws {UpstreamConnectionError} If cannot connect to upstream
 * @throws {ToolNotFoundError} If tool is not available
 */
export async function fetchScripture(
  args: FetchScriptureArgs
): Promise<ToolContent[]> {
  // Validate arguments
  if (!args.reference) {
    throw new InvalidArgumentsError('reference is required');
  }

  // Call upstream
  const result = await this.callTool('fetch_scripture', args);
  
  return result;
}
```

---

## Testing Requirements

### Test Coverage

All contributions must include tests:

- **Unit tests** for new functions/classes
- **Integration tests** for API changes
- **E2E tests** for new workflows

### Test Structure

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = doSomething(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/unit/core/filter-engine.test.ts

# Run tests matching pattern
npm test -- -t "should filter tools"

# Watch mode
npm run test:watch
```

### Test Guidelines

- **Test behavior, not implementation**
- **Use descriptive test names**
- **One assertion per test** (when possible)
- **Mock external dependencies** in unit tests
- **Use real services** in integration tests
- **Clean up after tests** (close connections, etc.)

---

## Pull Request Process

### Before Submitting

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following coding standards

3. **Add tests** for your changes

4. **Run all checks:**
   ```bash
   npm run lint
   npm run format
   npm run build
   npm test
   ```

5. **Update documentation** if needed

6. **Commit your changes** following commit guidelines

### Submitting PR

1. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request** on GitHub

3. **Fill out PR template** with:
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (if UI changes)

4. **Wait for review** and address feedback

### PR Requirements

- ✅ All tests passing
- ✅ Code linted and formatted
- ✅ Documentation updated
- ✅ No merge conflicts
- ✅ Reviewed and approved
- ✅ CI/CD checks passing

---

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation changes
- **style:** Code style changes (formatting, etc.)
- **refactor:** Code refactoring
- **test:** Adding or updating tests
- **chore:** Maintenance tasks

### Examples

```bash
# Feature
feat(core): add caching support for tool lists

# Bug fix
fix(stdio): handle connection errors gracefully

# Documentation
docs(readme): update installation instructions

# Test
test(integration): add tests for OpenAI API

# Refactor
refactor(filter): simplify tool filtering logic
```

### Scope

Use the component name:
- `core` - Core API
- `mcp-server` - MCP HTTP Server
- `stdio` - stdio Server
- `llm-helper` - LLM Helper
- `openai-api` - OpenAI API
- `tests` - Tests
- `docs` - Documentation

---

## Documentation

### Code Documentation

- **JSDoc comments** for public APIs
- **Inline comments** for complex logic
- **README files** in subdirectories
- **Type definitions** for all exports

### Documentation Files

When adding features, update:

- **README.md** - If user-facing changes
- **ARCHITECTURE.md** - If architectural changes
- **Interface docs** - If interface changes
- **API docs** - For new APIs

### Documentation Style

- Use **clear, concise language**
- Provide **code examples**
- Include **error handling** examples
- Add **links** to related docs
- Keep **up to date** with code changes

---

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0) - Breaking changes
- **MINOR** (0.1.0) - New features (backward compatible)
- **PATCH** (0.0.1) - Bug fixes

### Release Steps

1. **Update version** in `package.json`
2. **Create release commit:**
   ```bash
   git commit -m "chore: release v0.1.0"
   ```
4. **Create git tag:**
   ```bash
   git tag v0.1.0
   ```
5. **Push changes:**
   ```bash
   git push origin main --tags
   ```
6. **Create GitHub release**
7. **Deploy to npm** (if applicable)
8. **Deploy to CloudFlare Workers**

---

## Development Workflow

### Feature Development

1. **Create issue** describing the feature
2. **Discuss approach** with maintainers
3. **Create feature branch**
4. **Implement feature** with tests
5. **Submit PR** for review
6. **Address feedback**
7. **Merge when approved**

### Bug Fixes

1. **Create issue** describing the bug
2. **Write failing test** that reproduces bug
3. **Fix the bug**
4. **Verify test passes**
5. **Submit PR** with fix

### Documentation Updates

1. **Identify outdated docs**
2. **Update documentation**
3. **Verify examples work**
4. **Submit PR**

---

## Getting Help

### Resources

- **Documentation:** [docs/INDEX.md](docs/INDEX.md)
- **Issues:** GitHub Issues
- **Discussions:** GitHub Discussions
- **Examples:** [examples/](examples/)

### Questions

- **General questions:** GitHub Discussions
- **Bug reports:** GitHub Issues
- **Feature requests:** GitHub Issues
- **Security issues:** Email maintainers privately

---

## Recognition

Contributors will be recognized in:

- **README.md** - Contributors section
- **GitHub** - Contributor graph

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to JS Translation Helps Proxy!** 🎉

Your contributions help make this project better for everyone.