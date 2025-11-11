> **WARNING:** This project was vibe coded and there are a minimal number of MCP commands which have actually been completed. Do not be fooled by the overly optimistic automatic documentation. The development methodology is to pick a specific command that needs to be implemented and get the agent to write a test which verifies that it is failing, and then push it until it no longer fails.

---

# JS Translation Helps Proxy

A TypeScript MCP proxy for translation-helps with multiple interfaces, built for CloudFlare Workers.

## Overview

This project provides a unified proxy service that bridges translation-helps APIs with multiple interface protocols:

- **Interface 1**: Core API (Direct HTTP/REST)
- **Interface 2**: SSE/HTTP MCP Server
- **Interface 3**: stdio MCP Server
- **Interface 3.5**: TypeScript LLM Interface
- **Interface 4**: OpenAI-compatible API

## Architecture

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for detailed system design and component descriptions.

## Project Structure

```
src/
├── core/           # Interface 1: Core API
├── mcp-server/     # Interface 2: SSE/HTTP MCP
├── stdio-server/   # Interface 3: stdio MCP
├── llm-helper/     # Interface 3.5: TypeScript LLM interface
├── openai-api/     # Interface 4: OpenAI-compatible API
└── shared/         # Shared utilities
tests/
├── unit/
├── integration/
└── e2e/
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
# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

### Deployment

```bash
# Deploy to CloudFlare Workers
npm run deploy
```

## Usage

### Interface 3: stdio MCP Server (npx executable)

The stdio MCP server allows desktop applications like Claude Desktop and Cline to use the proxy via the MCP protocol over standard input/output.

**Quick Start:**

```bash
# Show help
npx js-translation-helps-proxy --help

# List available tools
npx js-translation-helps-proxy --list-tools

# Start the server
npx js-translation-helps-proxy
```

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

**Documentation:**
- [stdio Server Documentation](docs/STDIO_SERVER.md) - Complete guide
- [Example Configurations](examples/README.md) - MCP client configs

### Interface 2: HTTP MCP Server

```bash
npm run start:http
```

### Interface 1: Core API

See [ARCHITECTURE.md](ARCHITECTURE.md) for programmatic usage of the core API.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

ISC