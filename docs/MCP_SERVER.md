# MCP SSE/HTTP Server (Interface 2)

The MCP SSE/HTTP Server provides a web-based interface to the Translation Helps proxy using the Model Context Protocol over HTTP and Server-Sent Events (SSE).

## Overview

**Interface 2** runs as an HTTP server using Hono, providing:
- SSE endpoint for real-time MCP communication
- HTTP POST endpoint for MCP messages
- Client-controlled filtering via query parameters or configuration
- Compatible with CloudFlare Workers

## Endpoints

### SSE Endpoint

**GET** `/mcp/sse`

Establishes a Server-Sent Events connection for MCP protocol communication.

**Query Parameters:**
- `enabledTools` (optional): Comma-separated list of enabled tools
- `hiddenParams` (optional): Comma-separated list of parameters to hide
- `filterBookChapterNotes` (optional): `true` or `false` to filter book/chapter notes

**Example:**
```bash
curl -N "http://localhost:8000/mcp/sse?enabledTools=fetch_scripture,fetch_translation_notes&filterBookChapterNotes=true"
```

### HTTP Message Endpoint

**POST** `/mcp/message`

Send MCP protocol messages via HTTP POST.

**Request Body:**
```json
{
  "method": "tools/list"
}
```

or

```json
{
  "method": "tools/call",
  "params": {
    "name": "fetch_scripture",
    "arguments": {
      "reference": "John 3:16"
    }
  }
}
```

**Example:**
```bash
# List tools
curl -X POST http://localhost:8000/mcp/message \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'

# Call a tool
curl -X POST http://localhost:8000/mcp/message \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "fetch_scripture",
      "arguments": {"reference": "John 3:16"}
    }
  }'
```

### Health Check

**GET** `/mcp/health`

Check server health and upstream connectivity.

**Response:**
```json
{
  "status": "healthy",
  "upstreamConnected": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Server Info

**GET** `/mcp/info`

Get server information and capabilities.

**Response:**
```json
{
  "name": "js-translation-helps-proxy",
  "version": "1.0.0",
  "protocol": "mcp",
  "transport": "sse/http",
  "capabilities": {
    "tools": true
  }
}
```

## Configuration

### Client-Controlled Filters

Unlike the OpenAI interface (Interface 4) which has baked-in filters, the MCP server allows clients to control filtering:

1. **Via Query Parameters** (SSE endpoint):
   ```
   /mcp/sse?enabledTools=fetch_scripture&filterBookChapterNotes=true
   ```

2. **Via Server Configuration**:
   ```typescript
   import { createMCPRoutes } from './mcp-server';
   
   const routes = createMCPRoutes({
     enabledTools: ['fetch_scripture', 'fetch_translation_notes'],
     hiddenParams: ['organization'],
     filterBookChapterNotes: true,
   });
   ```

### Environment Variables

When deployed to CloudFlare Workers, configure via `wrangler.toml`:

```toml
[vars]
UPSTREAM_URL = "https://translation-helps-mcp.pages.dev/api/mcp"
TIMEOUT = "30000"
LOG_LEVEL = "info"
```

## Usage Examples

### JavaScript/TypeScript Client

```typescript
import { SSEMCPServer } from 'js-translation-helps-proxy/mcp-server';

// Create server instance
const server = new SSEMCPServer({
  enabledTools: ['fetch_scripture', 'fetch_translation_notes'],
  filterBookChapterNotes: true,
  logLevel: 'info',
});

// Get available tools
const tools = await server.getClient().listTools();
console.log('Available tools:', tools);

// Call a tool
const result = await server.getClient().callTool('fetch_scripture', {
  reference: 'John 3:16',
});
console.log('Result:', result);
```

### Using with MCP Clients

The SSE endpoint is compatible with standard MCP clients:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const transport = new SSEClientTransport(
  new URL('http://localhost:8000/mcp/sse')
);

const client = new Client({
  name: 'my-mcp-client',
  version: '1.0.0',
}, {
  capabilities: {},
});

await client.connect(transport);

// List tools
const { tools } = await client.request({ method: 'tools/list' }, {});

// Call a tool
const result = await client.request({
  method: 'tools/call',
  params: {
    name: 'fetch_scripture',
    arguments: { reference: 'John 3:16' },
  },
}, {});
```

## Development

### Local Development

```bash
# Start development server
npm run dev:http

# Server will be available at http://localhost:8787
```

### Testing

```bash
# Test SSE connection
curl -N http://localhost:8787/mcp/sse

# Test message endpoint
curl -X POST http://localhost:8787/mcp/message \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
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

## Differences from Interface 3 (stdio)

| Feature | Interface 2 (SSE/HTTP) | Interface 3 (stdio) |
|---------|----------------------|---------------------|
| Transport | HTTP/SSE | stdio streams |
| Use Case | Web services, APIs | CLI tools, desktop apps |
| Filtering | Client-controlled | Client-controlled |
| Deployment | CloudFlare Workers | Local process |
| Scalability | High (serverless) | Single process |

## See Also

- [OpenAI API Documentation](./OPENAI_API.md) - Interface 4 with baked-in filters
- [stdio Server Documentation](./STDIO_SERVER.md) - Interface 3 for CLI usage
- [Main README](../README.md) - Project overview