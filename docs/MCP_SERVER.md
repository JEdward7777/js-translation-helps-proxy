# MCP HTTP Server (Interface 2)

The MCP HTTP Server provides a web-based interface to the Translation Helps proxy using the official Model Context Protocol Streamable HTTP transport.

## Overview

**Interface 2** runs as an HTTP server using Hono, providing:
- Official MCP Streamable HTTP transport at `/mcp`
- Compatible with MCP Inspector and standard MCP clients
- Client-controlled filtering via configuration
- Compatible with CloudFlare Workers
- Supports both request/response (POST) and streaming (GET) modes

## Endpoints

### Official MCP Endpoint

**POST** `/mcp` - Send JSON-RPC 2.0 requests

**GET** `/mcp` - Establish SSE stream for notifications

**DELETE** `/mcp` - Terminate session

The `/mcp` endpoint implements the official [MCP Streamable HTTP transport specification](https://spec.modelcontextprotocol.io/specification/2024-11-05/transport/http/).

### Initialize Connection

**Request:**
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "js-translation-helps-proxy",
      "version": "1.0.0"
    }
  }
}
```

The response includes a `Mcp-Session-Id` header that should be included in subsequent requests.

### List Tools

**Request:**
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "fetch_scripture",
        "description": "Fetch scripture text for a given reference",
        "inputSchema": {
          "type": "object",
          "properties": {
            "reference": {
              "type": "string",
              "description": "Bible reference (e.g., 'John 3:16')"
            }
          },
          "required": ["reference"]
        }
      }
    ]
  }
}
```

### Call Tool

**Request:**
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "fetch_scripture",
      "arguments": {
        "reference": "John 3:16"
      }
    }
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "For God so loved the world..."
      }
    ]
  }
}
```

## MCP Inspector Setup

The MCP Inspector is a web-based tool for testing MCP servers. To connect:

1. Install and run MCP Inspector:
```bash
npx @modelcontextprotocol/inspector
```

2. In the Inspector UI:
   - **Transport Type:** Select "Streamable HTTP"
   - **URL:** Enter `http://localhost:8787/mcp`
   - Click **"Connect"**

3. The Inspector will:
   - Send an `initialize` request
   - Display available tools
   - Allow you to test tool calls interactively

## Configuration

### Server Configuration

```typescript
import { createStreamableMCPRoutes } from 'js-translation-helps-proxy/mcp-server';

const routes = createStreamableMCPRoutes({
  enabledTools: ['fetch_scripture', 'fetch_translation_notes'],
  hiddenParams: ['organization'],
  filterBookChapterNotes: true,
  logLevel: 'info',
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabledTools` | `string[]` | all tools | Limit which tools are available |
| `hiddenParams` | `string[]` | none | Hide parameters from tool schemas |
| `filterBookChapterNotes` | `boolean` | `false` | Filter translation notes to book/chapter level |
| `logLevel` | `string` | `'info'` | Logging level: 'debug', 'info', 'warn', 'error' |

### Environment Variables

When deployed to CloudFlare Workers, configure via `wrangler.toml`:

```toml
[vars]
UPSTREAM_URL = "https://translation-helps-mcp.pages.dev/api/mcp"
TIMEOUT = "30000"
LOG_LEVEL = "info"
```

## Usage Examples

### TypeScript Client with Official SDK

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Create transport
const transport = new StreamableHTTPClientTransport({
  url: 'http://localhost:8787/mcp',
});

// Create client
const client = new Client({
  name: 'my-client',
  version: '1.0.0',
}, {
  capabilities: {},
});

// Connect
await client.connect(transport);

// List tools
const { tools } = await client.listTools();
console.log('Available tools:', tools);

// Call a tool
const result = await client.callTool({
  name: 'fetch_scripture',
  arguments: { reference: 'John 3:16' },
});
console.log('Result:', result);
```

### Manual HTTP Client

```typescript
// Initialize session
const initResponse = await fetch('http://localhost:8787/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'my-client', version: '1.0.0' },
    },
  }),
});

const sessionId = initResponse.headers.get('Mcp-Session-Id');

// List tools
const toolsResponse = await fetch('http://localhost:8787/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Mcp-Session-Id': sessionId,
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
  }),
});

const { result } = await toolsResponse.json();
console.log('Tools:', result.tools);
```

## Development

### Local Development

```bash
# Start development server (Wrangler)
npm run dev:http

# Start development server (Native Node.js - better for debugging)
npm run dev:node

# Server will be available at http://localhost:8787
```

### Testing with curl

```bash
# Initialize
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }' -i

# List tools (use session ID from initialize response)
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

### Testing with MCP Inspector

The easiest way to test is with the MCP Inspector:

```bash
# Install and run
npx @modelcontextprotocol/inspector

# Then connect to http://localhost:8787/mcp
```

## Deployment

### CloudFlare Workers

```bash
# Deploy to CloudFlare Workers
npm run deploy

# Deploy to production environment
npm run deploy:production
```

### Configuration

Update `wrangler.toml` with your settings:

```toml
name = "js-translation-helps-proxy"
main = "dist/openai-api/index.js"

[vars]
UPSTREAM_URL = "https://your-upstream-api.com/api/mcp"
LOG_LEVEL = "info"
```

## Session Management

The Streamable HTTP transport supports two modes:

### Stateful Mode (Default)

- Server generates and manages session IDs
- Session ID included in `Mcp-Session-Id` header
- Maintains connection state between requests
- Supports SSE streaming for notifications

### Stateless Mode

- No session management
- Each request is independent
- Simpler but no streaming support

The current implementation uses **stateful mode** with automatic session ID generation.

## Streaming Support

The GET endpoint supports Server-Sent Events (SSE) for streaming:

```bash
# Establish SSE stream
curl -N -H "Mcp-Session-Id: <session-id>" \
  http://localhost:8787/mcp
```

This allows the server to push notifications and progress updates to the client.

## Differences from Legacy Interface

| Feature | New (Streamable HTTP) | Legacy (Custom HTTP) |
|---------|----------------------|---------------------|
| Endpoint | `/mcp` | `/mcp/message`, `/mcp/health`, `/mcp/info` |
| Protocol | JSON-RPC 2.0 | Custom format |
| Transport | Official MCP spec | Custom implementation |
| MCP Inspector | ✅ Compatible | ❌ Not compatible |
| Session Management | ✅ Built-in | ❌ None |
| Streaming | ✅ SSE support | ❌ None |

## Troubleshooting

### Connection Issues

If MCP Inspector won't connect:

1. Check server is running: `curl http://localhost:8787/`
2. Verify CORS headers are enabled
3. Check browser console for errors
4. Ensure URL is `http://localhost:8787/mcp` (no trailing slash)

### Session Errors

If you get "Invalid session ID" errors:

1. Ensure you're sending the `Mcp-Session-Id` header
2. Use the session ID from the initialize response
3. Check session hasn't expired (restart server if needed)

### Tool Call Failures

If tool calls fail:

1. Verify tool name is correct (use `tools/list` to check)
2. Check arguments match the tool's input schema
3. Review server logs for detailed error messages

## See Also

- [MCP Specification - Streamable HTTP Transport](https://spec.modelcontextprotocol.io/specification/2024-11-05/transport/http/)
- [OpenAI API Documentation](./OPENAI_API.md) - Interface 4 with baked-in filters
- [stdio Server Documentation](./STDIO_SERVER.md) - Interface 3 for CLI usage
- [Main README](../README.md) - Project overview