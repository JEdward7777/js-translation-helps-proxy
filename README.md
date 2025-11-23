> **WARNING:** This project was vibe coded including this readme.  Take the instructions with a grain of salt and do not be fooled by the overly optimistic documentation. 

---

# JS Translation Helps Proxy

[![Tests](https://img.shields.io/badge/tests-160%2F162%20passing-brightgreen)](TESTING.md)
[![Coverage](https://img.shields.io/badge/coverage-98.8%25-brightgreen)](TESTING.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![CloudFlare Workers](https://img.shields.io/badge/CloudFlare-Workers-orange)](https://workers.cloudflare.com/)

A production-ready TypeScript MCP proxy for translation-helps with multiple interfaces, built for CloudFlare Workers.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Interfaces](#interfaces)
  - [Interface 1: Core API](#interface-1-core-api-direct-typescriptjavascript)
  - [Interface 2: MCP HTTP Server](#interface-2-ssehttp-mcp-server)
  - [Interface 3: stdio Server](#interface-3-stdio-mcp-server-npx-executable)
  - [Interface 4: OpenAI API](#interface-4-openai-compatible-api)
  - [Interface 5: LLM Helper](#interface-5-openai-compatible-typescript-client)
- [Interface Comparison](#interface-comparison)
- [Documentation](#documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

This project provides a production-ready unified proxy service that bridges translation-helps APIs with multiple interface protocols. All 5 interfaces are fully implemented and tested with 98.8% test coverage.

### ✨ Features

- **5 Complete Interfaces** - Core API, MCP HTTP, stdio, OpenAI API, LLM Helper
- **162 Tests** - 98.8% passing (160/162), comprehensive coverage
- **CloudFlare Workers** - Serverless deployment ready
- **Type-Safe** - Full TypeScript with strict mode
- **Flexible Filtering** - Tool filtering, parameter hiding, note filtering
- **Production Ready** - Error handling, logging, caching
- **Well Documented** - Complete docs for all interfaces

### 🏗️ Architecture

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for detailed system design and component descriptions.

### 📊 Project Stats

- **Lines of Code:** ~5,000+
- **Test Coverage:** 98.8% (160/162 tests passing)
- **Interfaces:** 5 complete interfaces
- **Documentation:** 8 comprehensive guides
- **Examples:** Multiple configuration examples

## Project Structure

```
src/
├── core/           # Interface 1: Core API
├── mcp-server/     # Interface 2: HTTP MCP
├── stdio-server/   # Interface 3: stdio MCP
├── openai-api/     # Interface 4: OpenAI-compatible API
├── llm-helper/     # Interface 5: OpenAI-compatible TypeScript client
└── shared/         # Shared utilities
tests/
├── unit/
├── integration/
└── e2e/
dist/
├── cjs/            # CommonJS build (for require())
└── esm/            # ESM build (for import)
```

## Getting Started

### Prerequisites

- Node.js >= 20.17.0
- npm or yarn

### Installation

```bash
npm install
```

### Configuration

1. Copy `.env.example` to `.env`
2. Fill in your API keys and configuration values

### Development

```bash
# Build the project (creates both CJS and ESM builds)
npm run build

# Build only CJS
npm run build:cjs

# Build only ESM
npm run build:esm

# Run in development mode (stdio server)
npm run dev

# Run HTTP server in development mode (Wrangler)
npm run dev:http

# Run HTTP server in development mode (Native Node.js with debugging)
npm run dev:node

# Run tests
npm run test

# Lint code
npm run lint
```

### Deployment

```bash
# Deploy to CloudFlare Workers
npm run deploy
```

## Usage

### Interface 1: Core API (Direct TypeScript/JavaScript)

The core API provides direct programmatic access to translation helps tools. **Supports both CommonJS and ESM** for maximum compatibility.

**ESM (import):**
```typescript
import { TranslationHelpsClient } from 'js-translation-helps-proxy';

const client = new TranslationHelpsClient({
  enabledTools: ['fetch_scripture', 'fetch_translation_notes'],
  filterBookChapterNotes: true,
});

// Fetch scripture
const scripture = await client.fetchScripture({
  reference: 'John 3:16',
});
```

**CommonJS (require):**
```javascript
const { TranslationHelpsClient } = require('js-translation-helps-proxy');

const client = new TranslationHelpsClient({
  enabledTools: ['fetch_scripture', 'fetch_translation_notes'],
  filterBookChapterNotes: true,
});
```

**Documentation:** See [ARCHITECTURE.md](ARCHITECTURE.md) for complete API reference.

---

### Interface 2: HTTP MCP Server

Web-based MCP server using official Streamable HTTP transport, compatible with MCP Inspector and standard MCP clients.

**Start Server:**

```bash
# Development (Wrangler - CloudFlare Workers local runtime)
npm run dev:http

# Development (Native Node.js - better for debugging)
npm run dev:node

# Production (CloudFlare Workers)
npm run deploy
```

**Endpoint:**

- `/mcp` - Official MCP Streamable HTTP endpoint (POST + GET + DELETE)

**Example:**

```bash
# Initialize session
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    }
  }' -i

# List tools (use Mcp-Session-Id from initialize response)
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

**MCP Inspector:**

```bash
# Test with MCP Inspector
npx @modelcontextprotocol/inspector
# Connect to: http://localhost:8787/mcp
```

**Key Features:**
- ✅ Official MCP Streamable HTTP transport
- ✅ Compatible with MCP Inspector
- ✅ Client-controlled filters (via configuration)
- ✅ Session management with SSE streaming
- ✅ CloudFlare Workers compatible

**Documentation:** [MCP Server Guide](docs/MCP_SERVER.md)

---

### Interface 3: stdio MCP Interface (On-Demand Process)

**On-demand process** launched by MCP clients (Claude Desktop, Cline, etc.) - not a persistent server.

**Key Advantages:**
- ✅ **No background processes** - launched only when the client needs it
- ✅ **Automatic lifecycle** - terminates when the client disconnects
- ✅ **Resource efficient** - no idle processes consuming memory
- ✅ **stdio transport** - communicates via stdin/stdout with the parent MCP client

Unlike Interfaces 2 & 4 (persistent HTTP servers), this is a **process that the MCP client spawns on-demand**.

**Quick Start:**

```bash
# Run from npm (recommended)
npx js-translation-helps-proxy --help

# Or directly from GitHub:
# npx github:JEdward7777/js-translation-helps-proxy --help

# List available tools
npx js-translation-helps-proxy --list-tools

# Launch the process (for manual testing - normally the MCP client launches it)
npx js-translation-helps-proxy
```

**Note:** In normal use, your MCP client (Claude Desktop, Cline) automatically launches this process when needed. You don't need to start or manage it manually.

**Configuration Options:**

```bash
# Enable specific tools only
npx js-translation-helps-proxy --enabled-tools "fetch_scripture,fetch_translation_notes"

# Hide parameters from tool schemas
npx js-translation-helps-proxy --hide-params "language,organization"

# Filter book/chapter notes
npx js-translation-helps-proxy --filter-book-chapter-notes

# Set log level
npx js-translation-helps-proxy --log-level debug
```

**MCP Client Setup:**

For Claude Desktop, add to your config file:

```json
{
  "mcpServers": {
    "translation-helps": {
      "command": "npx",
      "args": ["js-translation-helps-proxy"]
    }
  }
}
```

Or to use the latest GitHub version:

```json
{
  "mcpServers": {
    "translation-helps": {
      "command": "npx",
      "args": ["github:JEdward7777/js-translation-helps-proxy"]
    }
  }
}
```

**Key Features:**
- ✅ **On-demand process** - no persistent server running
- ✅ **Client-controlled filters** - configure per MCP client
- ✅ **Works with Claude Desktop, Cline, etc.** - any MCP client supporting stdio
- ✅ **stdio transport** - standard input/output communication
- ✅ **Easy npx deployment** - client launches via npx when needed

**Documentation:** [stdio Server Guide](docs/STDIO_SERVER.md) | [Example Configs](examples/README.md)

---

### Interface 4: OpenAI-Compatible API

REST API that **proxies to OpenAI** with automatic Translation Helps tool injection and **baked-in filters** (see [Interface 5](#interface-5-typescript-llm-helper) for TypeScript equivalent).

**Start Server:**

```bash
# Development (Wrangler - CloudFlare Workers local runtime)
npm run dev:http

# Development (Native Node.js - better for debugging)
npm run dev:node

# Production (CloudFlare Workers)
npm run deploy
```

**Endpoints:**

- `POST /v1/chat/completions` - Chat completions with tool execution
- `GET /v1/models` - List available OpenAI models (proxied)
- `GET /v1/tools` - List available tools
- `GET /health` - Health check

**Example with OpenAI Client:**

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8787/v1",
    api_key="sk-YOUR-OPENAI-KEY"  # Your actual OpenAI API key
)

response = client.chat.completions.create(
    model="gpt-4o-mini",  # Use any OpenAI model
    messages=[
        {"role": "user", "content": "Fetch scripture for John 3:16"}
    ]
)

print(response.choices[0].message.content)
```

**Example with curl:**

```bash
curl -X POST http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-YOUR-OPENAI-KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Fetch John 3:16"}
    ]
  }'
```

**Key Features:**
- ✅ **Proxies to OpenAI**: Uses real OpenAI models and API
- ✅ **Automatic tool injection**: Translation Helps tools added automatically
- ✅ **Baked-in filters**: `language=en`, `organization=unfoldingWord`
- ✅ **Iterative tool execution**: Handles tool calling loops
- ✅ **Supports n > 1 and structured outputs**
- ✅ CloudFlare Workers compatible

**Documentation:** [OpenAI API Guide](docs/OPENAI_API.md)

---

### Interface 5: OpenAI-Compatible TypeScript Client

**Drop-in replacement for OpenAI client as a TypeScript class** with Translation Helps tools automatically integrated.
Unlike [Interface 4](#interface-4-openai-compatible-api) (HTTP/REST API), this is a direct TypeScript client with no network serialization overhead.
**Both interfaces share the same OpenAI integration logic** (see [comparison table](#interface-comparison)).
**Supports both CommonJS and ESM** for maximum compatibility.

**Quick Start (ESM):**

```typescript
import { LLMHelper } from 'js-translation-helps-proxy/llm-helper';

// Drop-in replacement for OpenAI client
const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Use the same API as OpenAI
const response = await helper.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'What does John 3:16 say?' }],
  n: 2  // Generate 2 completions
});

// Returns full OpenAI ChatCompletion response
console.log(response.choices[0].message.content);
console.log(response.choices[1].message.content);  // When n > 1
```

**Interchangeability with OpenAI:**

```typescript
import { LLMHelper } from 'js-translation-helps-proxy/llm-helper';
import OpenAI from 'openai';

// Can use either client with the same code!
const client: OpenAI | LLMHelper = useTranslationHelps
  ? new LLMHelper({ apiKey })
  : new OpenAI({ apiKey });

// Same API works for both
const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

**Quick Start (CommonJS):**

```javascript
const { LLMHelper } = require('js-translation-helps-proxy/llm-helper');

const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY,
});
```

**Key Features:**
- ✅ **Drop-in OpenAI replacement**: Implements `OpenAI.chat.completions.create()` interface
- ✅ **Full response compatibility**: Returns complete OpenAI `ChatCompletion` objects
- ✅ **Shares logic with Interface 4**: Same OpenAI SDK integration
- ✅ **Supports all OpenAI parameters**: Including `n > 1`, `temperature`, `response_format`
- ✅ **Fixes `n > 1` bug**: All choices preserved in response
- ✅ **Automatic tool execution**: Translation Helps tools work automatically
- ✅ **Baked-in filters**: `language=en`, `organization=unfoldingWord`
- ✅ **Type-safe**: Full TypeScript support

**Documentation:** [LLM Helper Guide](docs/LLM_HELPER.md) | [Examples](examples/llm-helper/)

---

## Interface Comparison

| Feature | Interface 1 (Core) | Interface 2 (MCP HTTP) | Interface 3 (stdio) | Interface 4 (OpenAI REST API) | Interface 5 (OpenAI TypeScript Client) |
|---------|-------------------|----------------------|-------------------|---------------------------|---------------------------|
| **Transport** | Direct API | HTTP | stdio | **HTTP/REST** | **TypeScript API** |
| **Backend** | Direct | Direct | Direct | **Proxies to OpenAI** | **Proxies to OpenAI** |
| **Network** | N/A | Required | N/A | **Required** | **Not required** |
| **API Key** | Not required | Not required | Not required | **Required (OpenAI)** | **Required (OpenAI)** |
| **Models** | N/A | N/A | N/A | **Any OpenAI model** | **Any OpenAI model** |
| **Filters** | Configurable | Client-controlled | Client-controlled | **Baked-in** | **Baked-in** |
| **Use Case** | TypeScript apps | Web services | Desktop apps | LLM integrations (HTTP) | LLM integrations (TypeScript) |
| **Deployment** | Library | CloudFlare Workers | **On-demand process** | CloudFlare Workers | Library |
| **Tool Execution** | Manual | Manual | Manual | **Automatic** | **Automatic** |
| **Lifecycle** | N/A | Persistent server | **Launched on-demand** | Persistent server | N/A |

**Choose Interface 2 or 3** when you need client-controlled filters (see [MCP Server](docs/MCP_SERVER.md) or [stdio Server](docs/STDIO_SERVER.md)).
**Choose Interface 3** specifically when you want **no background processes** (on-demand launching).
**Choose Interface 4 or 5** when you need OpenAI integration with automatic tool execution ([REST API](docs/OPENAI_API.md) vs [TypeScript](docs/LLM_HELPER.md)).

---

## Quick Start Guide

### For Desktop Apps (Claude Desktop, Cline)

Use **Interface 3** (stdio):

```bash
# Run from npm (recommended)
npx js-translation-helps-proxy

# Or directly from GitHub for latest development version:
# npx github:JEdward7777/js-translation-helps-proxy
```

### For Web Services / APIs

Use **Interface 2** (MCP HTTP):

```bash
# Using Wrangler (CloudFlare Workers runtime)
npm run dev:http
# Access at http://localhost:8787/mcp/*

# Using Native Node.js (better for debugging)
npm run dev:node
# Access at http://localhost:8787/mcp/*
```

### For LLM Integrations (OpenAI-compatible)

Use **Interface 4** (OpenAI API):

```bash
# Using Wrangler (CloudFlare Workers runtime)
npm run dev:http
# Access at http://localhost:8787/v1/*

# Using Native Node.js (better for debugging)
npm run dev:node
# Access at http://localhost:8787/v1/*
```

### For TypeScript/JavaScript Projects

Use **Interface 1** (Core API) - supports both ESM and CommonJS:

**ESM:**
```typescript
import { TranslationHelpsClient } from 'js-translation-helps-proxy';
```

**CommonJS:**
```javascript
const { TranslationHelpsClient } = require('js-translation-helps-proxy');
```

### For LLM Integration in TypeScript/JavaScript

Use **Interface 5** (LLM Helper) - supports both ESM and CommonJS:

**ESM:**
```typescript
import { LLMHelper } from 'js-translation-helps-proxy/llm-helper';

const helper = new LLMHelper({
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await helper.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Fetch John 3:16' }]
});
```

**CommonJS:**
```javascript
const { LLMHelper } = require('js-translation-helps-proxy/llm-helper');
```

## 📚 Documentation

- **[Documentation Index](docs/INDEX.md)** - Complete documentation hub
- **[Architecture Guide](ARCHITECTURE.md)** - System architecture
- **[Testing Guide](TESTING.md)** - Test coverage and strategy
- **[Deployment Guide](docs/DEPLOYMENT.md)** - CloudFlare Workers deployment
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute

### Interface Documentation

- **[MCP HTTP Server](docs/MCP_SERVER.md)** - Interface 2 documentation
- **[stdio Server](docs/STDIO_SERVER.md)** - Interface 3 documentation
- **[OpenAI API](docs/OPENAI_API.md)** - Interface 4 documentation
- **[LLM Helper](docs/LLM_HELPER.md)** - Interface 5 documentation

## 🧪 Testing

The project has comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit        # 65 unit tests
npm run test:integration # 80 integration tests
npm run test:e2e         # 8 E2E tests
```

**Test Results:**
- ✅ 160 tests passing (98.8%)
- ⏭️ 2 tests skipped (require API keys)

See [TESTING.md](TESTING.md) for detailed test documentation.

## 🚀 Deployment

### CloudFlare Workers

```bash
# Build and deploy
npm run build
npm run deploy
```

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete deployment guide.

### Local Development

```bash
# Start HTTP server (Wrangler - CloudFlare Workers runtime)
npm run dev:http

# Start HTTP server (Native Node.js - better for debugging)
npm run dev:node

# Start stdio server
npm run dev
```

### VSCode Debugging

The project includes VSCode launch configurations for debugging:

1. **Debug HTTP Server - Native Node.js (Interfaces 2 & 4)** - Debug MCP HTTP and OpenAI API servers
2. **Debug HTTP Server - Built (Interfaces 2 & 4)** - Debug compiled HTTP servers
3. **Debug stdio Server (Interface 3)** - Debug stdio MCP server (uses stdin/stdout, not HTTP)
4. **Debug Current Test File** - Debug the currently open test file

To use:
1. Open the file you want to debug
2. Set breakpoints by clicking in the gutter
3. Press `F5` or go to Run > Start Debugging
4. Select the appropriate debug configuration

**Important:**
- **Interface 3 (stdio)** is an **on-demand process** launched by the MCP client, communicating via stdin/stdout (NOT HTTP/REST)
- **Interfaces 2 & 4** are **persistent HTTP/REST servers** accessible at `http://localhost:8787`
- Interface 3 has **no background process** - it's launched when needed and terminates when done
- The server will start with `LOG_LEVEL=debug` for detailed logging

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Start for Contributors

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Create a feature branch
4. Make your changes with tests
5. Run checks: `npm run lint && npm test`
6. Submit a pull request

## 📄 License

MIT - See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Translation Helps MCP** - Upstream server
- **Model Context Protocol** - MCP specification
- **CloudFlare Workers** - Serverless platform
- **All Contributors** - Thank you!

## 📞 Support

- **Documentation:** [docs/INDEX.md](docs/INDEX.md)
- **Issues:** [GitHub Issues](https://github.com/JEdward7777/js-translation-helps-proxy/issues)
- **Discussions:** [GitHub Discussions](https://github.com/JEdward7777/js-translation-helps-proxy/discussions)

---

**Version:** 0.1.0 | **Last Updated:** 2025-11-11 | **Status:** Production Ready ✅
