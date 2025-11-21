# Documentation Index

Welcome to the JS Translation Helps Proxy documentation! This guide will help you navigate all available documentation and get started with the right interface for your needs.

## 📚 Quick Navigation

### Getting Started
- [README.md](../README.md) - Project overview and quick start
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture and design
- [TESTING.md](../TESTING.md) - Testing strategy and coverage

### Interface Documentation
- [Interface 1: Core API](#interface-1-core-api) - Direct TypeScript/JavaScript API
- [Interface 2: MCP HTTP Server](MCP_SERVER.md) - HTTP MCP server
- [Interface 3: stdio Server](STDIO_SERVER.md) - Desktop application interface
- [Interface 3.5: LLM Helper](LLM_HELPER.md) - TypeScript LLM integration
- [Interface 4: OpenAI API](OPENAI_API.md) - OpenAI-compatible REST API

### Deployment & Operations
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide (CloudFlare Workers)
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contributing guidelines

### Examples
- [Example Configurations](../examples/README.md) - Sample configs for all interfaces

---

## 🎯 Choose Your Interface

### I want to use it in my TypeScript/JavaScript app
→ **[Interface 1: Core API](#interface-1-core-api)**

```typescript
import { TranslationHelpsClient } from 'js-translation-helps-proxy';

const client = new TranslationHelpsClient();
const scripture = await client.fetchScripture({ reference: 'John 3:16' });
```

**Best for:** Direct integration in Node.js or browser applications

---

### I want to deploy a web service
→ **[Interface 2: MCP HTTP Server](MCP_SERVER.md)**

```bash
npm run deploy  # Deploy to CloudFlare Workers
```

**Best for:** Web services, APIs, microservices architecture

---

### I want to use it with Claude Desktop or Cline
→ **[Interface 3: stdio Interface](STDIO_SERVER.md)** (On-Demand Process)

```bash
# The MCP client launches this process automatically when needed
# You just configure it in your MCP client settings

# For manual testing:
npx github:JEdward7777/js-translation-helps-proxy

# Or when published to npm:
# npx js-translation-helps-proxy
```

**Best for:** Desktop AI applications (Claude Desktop, Cline, etc.)
**Key advantage:** No background processes - launched on-demand by the client

---

### I want to integrate with an LLM in TypeScript
→ **[Interface 3.5: LLM Helper](LLM_HELPER.md)**

```typescript
import { LLMHelper } from 'js-translation-helps-proxy/llm-helper';

const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini'
});

const response = await helper.chat([
  { role: 'user', content: 'What does John 3:16 say?' }
]);
```

**Best for:** Building LLM-powered applications with automatic tool execution (uses same logic as Interface 4)

---

### I want an OpenAI-compatible REST API
→ **[Interface 4: OpenAI API](OPENAI_API.md)**

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8787/v1",
    api_key="sk-YOUR-OPENAI-KEY"  # Your actual OpenAI API key
)

response = client.chat.completions.create(
    model="gpt-4o-mini",  # Use any OpenAI model
    messages=[{"role": "user", "content": "Fetch John 3:16"}]
)
```

**Best for:** Proxying to OpenAI with automatic Translation Helps tool injection

---

## 📖 Interface Comparison

| Feature | Core API | MCP HTTP | stdio | LLM Helper | OpenAI Proxy |
|---------|----------|----------|-------|------------|--------------|
| **Language** | TypeScript/JS | Any (HTTP) | Any (MCP) | TypeScript | Any (HTTP) |
| **Backend** | Direct | Direct | Direct | **Proxies to OpenAI** | **Proxies to OpenAI** |
| **API Key** | Not required | Not required | Not required | **Required (OpenAI)** | **Required (OpenAI)** |
| **Deployment** | Library | CloudFlare Workers | **On-demand process** | Library | CloudFlare Workers |
| **Lifecycle** | N/A | Persistent server | **Launched on-demand** | N/A | Persistent server |
| **Filters** | Configurable | Client-controlled | Client-controlled | Baked-in | Baked-in |
| **Tool Execution** | Manual | Manual | Manual | Automatic | Automatic |
| **Use Case** | Direct integration | Web services | Desktop apps | LLM apps (code) | LLM apps (REST) |
| **Complexity** | Low | Medium | Low | Medium | Low |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Translation Helps Proxy                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Interface 1  │  │ Interface 2  │  │ Interface 3  │      │
│  │  Core API    │  │  MCP HTTP    │  │    stdio     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │  Core Engine   │                        │
│                    │  - Filtering   │                        │
│                    │  - Formatting  │                        │
│                    │  - Caching     │                        │
│                    └───────┬────────┘                        │
│                            │                                 │
│  ┌──────────────┐  ┌──────▼────────┐                        │
│  │ Interface 3.5│  │ Interface 4   │                        │
│  │  LLM Helper  │  │  OpenAI API   │                        │
│  └──────┬───────┘  └──────┬────────┘                        │
│         │                  │                                 │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │ Upstream Client│                        │
│                    └───────┬────────┘                        │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Translation    │
                    │  Helps MCP API  │
                    └─────────────────┘
```

See [ARCHITECTURE.md](../ARCHITECTURE.md) for detailed architecture documentation.

---

## 🚀 Quick Start Guides

### For Developers

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

4. **Start development server:**
   ```bash
   npm run dev:http
   ```

### For Users

1. **Use with Claude Desktop:**
   ```bash
   # Run from npm (recommended)
   npx js-translation-helps-proxy
   
   # Or directly from GitHub for latest development version:
   # npx github:JEdward7777/js-translation-helps-proxy
   ```
   See [STDIO_SERVER.md](STDIO_SERVER.md) for configuration.

2. **Deploy to CloudFlare Workers:**
   ```bash
   npm run deploy
   ```
   See [DEPLOYMENT.md](DEPLOYMENT.md) for details.

3. **Use in your TypeScript project:**
   ```bash
   npm install js-translation-helps-proxy
   ```
   See [Core API documentation](#interface-1-core-api) below.

---

## 📝 Interface 1: Core API

The Core API provides direct programmatic access to translation helps tools.

### Installation

```bash
npm install js-translation-helps-proxy
```

### Basic Usage

```typescript
import { TranslationHelpsClient } from 'js-translation-helps-proxy';

// Create client
const client = new TranslationHelpsClient({
  upstreamUrl: 'https://translation-helps-mcp.pages.dev/api/mcp',
  enabledTools: ['fetch_scripture', 'fetch_translation_notes'],
  hiddenParams: ['language', 'organization'],
  filterBookChapterNotes: true
});

// Fetch scripture
const scripture = await client.fetchScripture({
  reference: 'John 3:16'
});

// Fetch translation notes
const notes = await client.fetchTranslationNotes({
  reference: 'John 3:16'
});

// Get context
const context = await client.getContext({
  reference: 'John 3:16'
});
```

### Configuration Options

```typescript
interface TranslationHelpsConfig {
  upstreamUrl?: string;              // Upstream MCP server URL
  enabledTools?: string[];           // Filter to specific tools
  hiddenParams?: string[];           // Hide parameters from schemas
  filterBookChapterNotes?: boolean;  // Filter book/chapter notes
  timeout?: number;                  // Request timeout (ms)
}
```

### Available Methods

- `fetchScripture(args)` - Fetch scripture text
- `fetchTranslationNotes(args)` - Fetch translation notes
- `fetchTranslationQuestions(args)` - Fetch translation questions
- `getTranslationWord(args)` - Get translation word definitions
- `browseTranslationWords(args)` - Browse translation words
- `getContext(args)` - Get verse context
- `extractReferences(args)` - Extract Bible references from text
- `getSystemPrompt(args)` - Get system prompt
- `listTools()` - List available tools
- `callTool(name, args)` - Call any tool by name
- `testConnection()` - Test upstream connection
- `updateConfig(config)` - Update configuration
- `getConfig()` - Get current configuration
- `clearCache()` - Clear tool cache
- `getCacheStatus()` - Get cache status

### Error Handling

```typescript
import {
  TranslationHelpsError,
  UpstreamConnectionError,
  UpstreamResponseError,
  ToolNotFoundError,
  ToolDisabledError,
  InvalidArgumentsError
} from 'js-translation-helps-proxy';

try {
  const result = await client.fetchScripture({ reference: 'John 3:16' });
} catch (error) {
  if (error instanceof UpstreamConnectionError) {
    console.error('Cannot connect to upstream server');
  } else if (error instanceof ToolNotFoundError) {
    console.error('Tool not found');
  } else if (error instanceof ToolDisabledError) {
    console.error('Tool is disabled');
  }
}
```

### Advanced Usage

```typescript
// Dynamic configuration updates
client.updateConfig({
  filterBookChapterNotes: false,
  enabledTools: ['fetch_scripture']
});

// Cache management
const cacheStatus = client.getCacheStatus();
console.log(`Cache has ${cacheStatus.toolCount} tools`);

client.clearCache();

// Test connection
const connected = await client.testConnection();
if (!connected) {
  console.error('Cannot connect to upstream server');
}
```

---

## 🧪 Testing

See [TESTING.md](../TESTING.md) for comprehensive testing documentation.

**Quick test commands:**
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests only
npm run test:e2e
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

---

## 📄 License

MIT - See [LICENSE](../LICENSE) file for details.

---

## 🔗 Related Projects

- [Translation Helps MCP](https://github.com/klappy/translation-helps-mcp) - Upstream MCP server
- [Translation Helps Python Proxy](https://github.com/JEdward7777/translation_helps_mcp_proxy) - Python version

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/JEdward7777/js-translation-helps-proxy/issues)
- **Discussions:** [GitHub Discussions](https://github.com/JEdward7777/js-translation-helps-proxy/discussions)
- **Documentation:** This documentation index

---

## 🗺️ Documentation Map

```
docs/
├── INDEX.md (this file)          # Documentation hub
├── ARCHITECTURE.md               # System architecture
├── MCP_SERVER.md                 # Interface 2: MCP HTTP Server
├── STDIO_SERVER.md               # Interface 3: stdio Server
├── LLM_HELPER.md                 # Interface 3.5: LLM Helper
├── OPENAI_API.md                 # Interface 4: OpenAI API
├── DEPLOYMENT.md                 # Deployment guide
├── TESTING.md                    # Testing documentation
└── CONTRIBUTING.md               # Contributing guidelines

examples/
├── README.md                     # Examples overview
├── claude-desktop-config.json    # Claude Desktop config
├── cline-config.json             # Cline config
└── llm-helper/                   # LLM Helper examples
```

---

**Last Updated:** 2025-11-11  
**Version:** 0.1.0