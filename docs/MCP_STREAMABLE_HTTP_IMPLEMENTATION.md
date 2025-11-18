# MCP Streamable HTTP Transport Implementation Plan

## Overview

This document provides a complete implementation plan for adding official MCP Streamable HTTP transport to the js-translation-helps-proxy server. This will make Interface 2 compatible with the MCP Inspector and other standard MCP clients.

## Background

### Current State
- **Custom HTTP API** at `/mcp/message`, `/mcp/health`, `/mcp/info`
- Uses `Server` from `@modelcontextprotocol/sdk` but manually handles HTTP routing
- **Not compatible** with MCP Inspector or standard MCP clients

### Target State
- **Official MCP Streamable HTTP transport** at `/mcp` (POST + GET)
- Uses `StreamableHTTPServerTransport` from SDK
- **Compatible** with MCP Inspector and standard MCP clients
- **Replaces** custom `/mcp/message`, `/mcp/health`, `/mcp/info` endpoints
- **Coexists** with OpenAI-compatible API at `/v1/*`

## Architecture

```
Unified Hono Server (CloudFlare Workers compatible)
├── /mcp (POST + GET) ← Official MCP Streamable HTTP Transport (Interface 2)
│   └── Uses StreamableHTTPServerTransport from SDK
│   └── Compatible with MCP Inspector
│
├── /v1/chat/completions (POST) ← OpenAI Interface (Interface 4)
├── /v1/models (GET)
├── /v1/tools (GET)
├── /v1/info (GET)
└── /health (GET)
```

## Prerequisites

### 1. Verify SDK Version
Ensure `@modelcontextprotocol/sdk` is version **1.22.0 or later**:

```bash
npm list @modelcontextprotocol/sdk
```

If needed, update:
```bash
npm install @modelcontextprotocol/sdk@latest
```

### 2. Verify Required Imports
The SDK should export:
- `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/streamableHttp.js`
- `Server` from `@modelcontextprotocol/sdk/server/index.js`
- Request schemas from `@modelcontextprotocol/sdk/types.js`

## Implementation Steps

### Step 1: Create Streamable Transport Module

**File:** `src/mcp-server/streamable-transport.ts` (NEW FILE)

```typescript
/**
 * Official MCP Streamable HTTP Transport implementation
 * Compatible with MCP Inspector and standard MCP clients
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import { TranslationHelpsClient } from '../core/index.js';
import { logger } from '../shared/index.js';

export interface StreamableTransportConfig {
  enabledTools?: string[];
  hiddenParams?: string[];
  filterBookChapterNotes?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Create Hono routes for official MCP Streamable HTTP transport
 * Mounts at /mcp (POST + GET)
 */
export function createStreamableMCPRoutes(config: StreamableTransportConfig = {}): Hono {
  const app = new Hono();

  // Apply CORS middleware
  app.use('/mcp', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Mcp-Session-Id'],
  }));

  // Set log level
  if (config.logLevel) {
    logger.setLevel(config.logLevel);
  }

  // Create shared MCP Server instance
  const mcpServer = new Server(
    {
      name: 'js-translation-helps-proxy',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Create TranslationHelpsClient with filtering configuration
  const client = new TranslationHelpsClient({
    enabledTools: config.enabledTools,
    hiddenParams: config.hiddenParams,
    filterBookChapterNotes: config.filterBookChapterNotes,
  });

  // Register tool list handler
  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      logger.debug('Handling tools/list request via Streamable HTTP');
      const tools = await client.listTools();

      // Convert to MCP Tool format
      const mcpTools: Tool[] = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));

      logger.info(`Returning ${mcpTools.length} tools via Streamable HTTP`);
      return { tools: mcpTools };
    } catch (error) {
      logger.error('Error in tools/list handler', error);
      throw error;
    }
  });

  // Register tool call handler
  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args = {} } = request.params;
      logger.debug(`Handling tools/call request for tool: ${name}`, args);

      // Call the tool using TranslationHelpsClient
      const result = await client.callTool(name, args);

      logger.debug(`Tool ${name} executed successfully via Streamable HTTP`);
      return { content: result };
    } catch (error) {
      logger.error(`Error in tools/call handler for tool ${request.params.name}`, error);

      // Return error as text content
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` } as TextContent],
        isError: true,
      };
    }
  });

  /**
   * POST /mcp - Client sends JSON-RPC requests
   * This is the main endpoint for MCP communication
   */
  app.post('/mcp', async (c) => {
    try {
      logger.debug('Received POST /mcp request');
      
      // Create transport with raw Request object (CloudFlare Workers compatible)
      const transport = new StreamableHTTPServerTransport(c.req.raw, c.env);
      
      // Connect the MCP server to this transport
      await mcpServer.connect(transport);
      
      // Return the transport's response
      return transport.response ?? new Response('OK', { status: 200 });
    } catch (error) {
      logger.error('Error handling POST /mcp', error);
      return c.json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  /**
   * GET /mcp - Server streams responses (optional for streaming)
   * Used for server-to-client notifications and streaming responses
   */
  app.get('/mcp', async (c) => {
    try {
      logger.debug('Received GET /mcp request (streaming)');
      
      // Create transport with raw Request object
      const transport = new StreamableHTTPServerTransport(c.req.raw, c.env);
      
      // Connect the MCP server to this transport
      await mcpServer.connect(transport);
      
      // Return the transport's response (may be SSE stream)
      return transport.response ?? new Response('Streaming...', { 
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' }
      });
    } catch (error) {
      logger.error('Error handling GET /mcp', error);
      return c.json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  logger.info('Streamable MCP HTTP transport initialized', {
    endpoints: ['POST /mcp', 'GET /mcp'],
    enabledTools: config.enabledTools?.length || 'all',
    hiddenParams: config.hiddenParams?.length || 'none',
    filterBookChapterNotes: config.filterBookChapterNotes,
  });

  return app;
}
```

### Step 2: Update MCP Server Index

**File:** `src/mcp-server/index.ts` (MODIFY)

Replace exports to only export the new streamable transport:

```typescript
// Remove old exports
// export { SSEMCPServer } from './server.js';
// export { createMCPRoutes } from './routes.js';
// export type { SSEServerConfig } from './server.js';
// export type { MCPRoutesConfig } from './routes.js';

// Add new export
export { createStreamableMCPRoutes } from './streamable-transport.js';
export type { StreamableTransportConfig } from './streamable-transport.js';
```

**Note:** The old `server.ts` and `routes.ts` files can be deleted or kept for reference, but they are no longer used.

### Step 3: Update Unified Server

**File:** `src/openai-api/index.ts` (MODIFY)

Update imports and replace MCP mounting:

```typescript
// Update imports at top of file - REMOVE old import
// import { createMCPRoutes } from '../mcp-server/index.js';

// ADD new import
import { createStreamableMCPRoutes } from '../mcp-server/index.js';

// In createUnifiedServer function, REPLACE the MCP mounting section:

export function createUnifiedServer(config: UnifiedServerConfig = {}): Hono {
  // ... existing setup code ...

  // Mount official MCP Streamable HTTP transport at /mcp (Interface 2)
  const mcpRoutes = createStreamableMCPRoutes({
    enabledTools: config.mcp?.enabledTools,
    hiddenParams: config.mcp?.hiddenParams,
    filterBookChapterNotes: config.mcp?.filterBookChapterNotes,
  });
  app.route('/', mcpRoutes);

  logger.info('MCP Streamable HTTP transport mounted', {
    endpoints: ['POST /mcp', 'GET /mcp'],
    compatible: 'MCP Inspector, standard MCP clients',
    transport: 'StreamableHTTPServerTransport',
  });

  // Mount OpenAI routes (Interface 4) - unchanged
  const openaiRoutes = createOpenAIRoutes({
    // ... existing config ...
  });
  app.route('/', openaiRoutes);

  // ... rest of existing code ...
}
```

Update the root endpoint documentation:

```typescript
// In the app.get('/', ...) handler, update the mcp section:
app.get('/', (c) => {
  return c.json({
    name: 'js-translation-helps-proxy',
    version: '1.0.0',
    description: 'Unified HTTP server with MCP and OpenAI-compatible interfaces',
    interfaces: {
      mcp: {
        description: 'MCP server with official Streamable HTTP transport',
        endpoint: '/mcp',
        methods: ['POST', 'GET'],
        transport: 'StreamableHTTPServerTransport',
        compatible: 'MCP Inspector, standard MCP clients',
      },
      // ... rest unchanged ...
    },
  });
});
```

Update the catch-all handler:

```typescript
// In app.all('*', ...) handler, update availableEndpoints:
return c.json({
  error: 'Not Found',
  message: `No route found for ${method} ${path}`,
  availableEndpoints: {
    mcp: ['/mcp'],
    openai: ['/v1/chat/completions', '/v1/models', '/v1/tools', '/v1/info', '/health'],
    root: ['/'],
  },
}, 404);
```

## Testing

### Test 1: Verify Server Starts

```bash
npm run dev:node
# or
npm run dev:http
```

Check logs for:
```
[INFO] Streamable MCP HTTP transport initialized
[INFO] MCP Streamable HTTP transport mounted
[INFO] Legacy MCP HTTP interface mounted
```

### Test 2: Test with curl

```bash
# Test POST /mcp with initialize request
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

# Test tools/list
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

### Test 3: Test with MCP Inspector

```bash
# Install MCP Inspector
npx @modelcontextprotocol/inspector

# In the UI:
# - Transport Type: Streamable HTTP
# - URL: http://localhost:8787/mcp
# - Click "Connect"
```

Expected: Should connect successfully and show all available tools.

### Test 4: Verify OpenAI Endpoint Unaffected

```bash
# Test OpenAI endpoint
OPENAI_API_KEY=$(cat .env | grep OPENAI_API_KEY | cut -d'=' -f2)
curl http://localhost:8787/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

Expected: Should return models list as before.

## Documentation Updates

### Update `docs/MCP_SERVER.md`

Rewrite the document to focus on the official MCP Streamable HTTP transport:

1. **Overview** - Explain Interface 2 uses official MCP transport
2. **Endpoints** - Document `/mcp` (POST + GET)
3. **MCP Inspector Setup** - How to connect
4. **Configuration** - Client-controlled filters
5. **Usage Examples** - Code examples with official transport
6. **Testing** - How to test the endpoint

Remove all references to `/mcp/message`, `/mcp/health`, `/mcp/info` as these are being replaced.

### Update `README.md`

Update Interface 2 description:
```markdown
### Interface 2: MCP HTTP Server

HTTP server using official MCP Streamable HTTP transport, compatible with MCP Inspector and standard MCP clients.

**Endpoint:**
- `/mcp` - Official MCP Streamable HTTP endpoint (POST + GET)
```

## Deployment

### CloudFlare Workers

No changes needed to deployment process. The implementation uses:
- Native `Request`/`Response` objects (Workers-compatible)
- No Node.js-specific APIs
- Stateless design (no session storage required)

Deploy as usual:
```bash
npm run deploy
```

## Rollback Plan

If issues arise, revert the changes:

```bash
git checkout src/mcp-server/streamable-transport.ts
git checkout src/mcp-server/index.ts
git checkout src/openai-api/index.ts
git checkout docs/MCP_SERVER.md
git checkout README.md
```

Then restart the server to use the old implementation.

## Success Criteria

- ✅ MCP Inspector connects successfully to `http://localhost:8787/mcp`
- ✅ All tools are visible in MCP Inspector
- ✅ Tool calls work through MCP Inspector
- ✅ OpenAI endpoints (`/v1/*`) unaffected
- ✅ Server deploys successfully to CloudFlare Workers
- ✅ Clean implementation using official MCP SDK transport

## Notes

- The `StreamableHTTPServerTransport` handles JSON-RPC 2.0 protocol automatically
- Session management is optional (stateless mode works fine for most use cases)
- The transport supports both streaming (GET) and request/response (POST) modes
- CloudFlare Workers compatibility is maintained by using native Web APIs

## Questions or Issues

If you encounter issues during implementation:

1. **Import errors:** Verify SDK version is 1.22.0+
2. **Transport not found:** Check SDK exports with `npm list @modelcontextprotocol/sdk`
3. **MCP Inspector won't connect:** Check CORS headers and endpoint path
4. **CloudFlare Workers errors:** Ensure no Node.js-specific APIs are used

## References

- [MCP Specification - Streamable HTTP Transport](https://spec.modelcontextprotocol.io/specification/2024-11-05/transport/http/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Hono Documentation](https://hono.dev/)
- [CloudFlare Workers Documentation](https://developers.cloudflare.com/workers/)