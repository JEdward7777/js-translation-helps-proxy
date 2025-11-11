# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-11

### Added

#### Core Features
- **Interface 1: Core TypeScript API** - Direct programmatic access to translation helps
  - `TranslationHelpsClient` with full type safety
  - Tool filtering and parameter hiding
  - Book/chapter note filtering
  - Caching support
  - Comprehensive error handling

- **Interface 2: SSE/HTTP MCP Server** - Web-based MCP server
  - HTTP POST endpoint for MCP messages
  - SSE endpoint for real-time communication
  - Client-controlled filters via query parameters
  - Health check and info endpoints
  - CloudFlare Workers compatible

- **Interface 3: stdio MCP Server** - Desktop application interface
  - Full MCP protocol support over stdio
  - Command-line configuration options
  - Works with Claude Desktop, Cline, and other MCP clients
  - npx executable for easy installation

- **Interface 3.5: LLM Helper** - TypeScript LLM integration
  - Automatic tool execution with LLMs
  - Support for OpenAI and Anthropic providers
  - Baked-in filters (language=en, organization=unfoldingWord)
  - Iterative tool execution loop
  - Type-safe TypeScript API

- **Interface 4: OpenAI-Compatible API** - REST API
  - `/v1/chat/completions` endpoint
  - `/v1/models` endpoint
  - `/v1/tools` endpoint
  - Automatic tool execution
  - Baked-in filters
  - Works with OpenAI SDKs

#### Testing
- **153 total tests** with 95.4% passing rate
- **65 unit tests** - Fast, isolated component testing
- **80 integration tests** - Real upstream server testing
- **8 E2E tests** - Complete workflow validation
- Comprehensive test coverage across all interfaces
- Discovered upstream server bugs (browse_translation_words)

#### Documentation
- Complete architecture documentation
- Interface-specific guides for all 4 interfaces
- Deployment guide for CloudFlare Workers
- Testing documentation with coverage report
- Contributing guidelines
- Example configurations for all interfaces
- Comprehensive API documentation

#### Development Tools
- TypeScript with strict type checking
- ESLint for code quality
- Prettier for code formatting
- Vitest for testing
- Wrangler for CloudFlare Workers deployment

### Features by Interface

#### Interface 1: Core API
- Tool filtering (`enabledTools`)
- Parameter hiding (`hiddenParams`)
- Book/chapter note filtering (`filterBookChapterNotes`)
- Tool caching with cache management
- Connection testing
- Dynamic configuration updates
- Type-safe tool methods
- Comprehensive error types

#### Interface 2: MCP HTTP Server
- Client-controlled filters via query parameters
- SSE streaming support
- HTTP POST for request/response
- Health monitoring
- Server information endpoint
- CloudFlare Workers optimized

#### Interface 3: stdio Server
- Command-line arguments for configuration
- `--enabled-tools` for tool filtering
- `--hide-params` for parameter hiding
- `--filter-book-chapter-notes` for note filtering
- `--list-tools` to show available tools
- `--log-level` for logging control
- Full MCP protocol compliance

#### Interface 3.5: LLM Helper
- OpenAI provider support (GPT-3.5, GPT-4, etc.)
- Anthropic provider support (Claude models)
- Automatic tool registration
- Iterative tool execution (up to 5 iterations)
- Baked-in language and organization filters
- Type-safe message handling
- Configuration updates

#### Interface 4: OpenAI API
- OpenAI-compatible chat completions
- Automatic tool execution
- Model listing
- Tool listing
- Streaming support (future)
- Baked-in filters
- Works with any OpenAI-compatible client

### Technical Improvements
- CloudFlare Workers compatibility
- Efficient upstream client with caching
- Structured logging with multiple levels
- Response formatting and error handling
- Filter engine for tool/parameter management
- Modular architecture for easy extension

### Migration from Python Version
- **All Python features ported** to TypeScript
- **More comprehensive testing** (153 vs 37 tests)
- **Additional interfaces** (LLM Helper, OpenAI API)
- **Better error handling** with typed errors
- **Improved caching** with cache management
- **CloudFlare Workers support** for serverless deployment

### Known Issues
- `browse_translation_words` endpoint returns HTTP 500 (upstream server bug)
- 1 network error handling test needs assertion fix
- 4 LLM Helper tests skipped (require API keys)

### Dependencies
- `@modelcontextprotocol/sdk` ^1.21.1 - MCP protocol support
- `hono` ^4.10.5 - Web framework for CloudFlare Workers
- `openai` ^6.8.1 - OpenAI SDK for LLM integration
- `zod` ^3.25.76 - Schema validation

### Development Dependencies
- `typescript` ^5.9.3
- `vitest` ^4.0.8
- `wrangler` ^4.47.0
- `eslint` ^9.39.1
- `prettier` ^3.6.2
- `tsx` ^4.20.6

---

## [Unreleased]

### Planned Features
- KV caching for CloudFlare Workers
- Rate limiting
- Streaming support for OpenAI API
- Additional LLM providers
- Performance optimizations
- Enhanced monitoring and metrics

---

## Version History

- **0.1.0** (2025-11-11) - Initial release with all 4 interfaces

---

## Upgrade Guide

### From Python Version

The TypeScript version maintains API compatibility with the Python version while adding new features:

1. **Tool names remain the same** - No changes needed
2. **Configuration options similar** - Minor naming differences (camelCase vs snake_case)
3. **New interfaces available** - LLM Helper and OpenAI API
4. **Better error handling** - More specific error types
5. **CloudFlare Workers support** - Serverless deployment option

#### Configuration Migration

**Python:**
```python
proxy = MCPProxyServer(
    enabled_tools=['fetch_scripture'],
    hidden_params=['language', 'organization'],
    filter_book_chapter_notes=True
)
```

**TypeScript:**
```typescript
const client = new TranslationHelpsClient({
  enabledTools: ['fetch_scripture'],
  hiddenParams: ['language', 'organization'],
  filterBookChapterNotes: true
});
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

---

## License

ISC

---

**Maintained by:** Translation Helps Team  
**Repository:** https://github.com/yourusername/js-translation-helps-proxy