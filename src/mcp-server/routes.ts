/**
 * Hono routes for MCP HTTP endpoints
 * Provides HTTP endpoints for MCP protocol
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SSEMCPServer } from './server.js';
import { logger } from '../shared/index.js';

export interface MCPRoutesConfig {
  enabledTools?: string[];
  hiddenParams?: string[];
  filterBookChapterNotes?: boolean;
}

/**
 * Create Hono routes for MCP endpoints
 */
export function createMCPRoutes(config: MCPRoutesConfig = {}): Hono {
  const app = new Hono();

  // Apply CORS middleware
  app.use('/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }));

  // Create MCP server instance
  const mcpServer = new SSEMCPServer(config);

  /**
   * HTTP endpoint for MCP messages
   * POST /mcp/message
   */
  app.post('/mcp/message', async (c) => {
    try {
      const body = await c.req.json();
      logger.debug('Received MCP message', body);

      const { method, params } = body;

      if (!method) {
        return c.json({ error: 'Missing method field' }, 400);
      }

      const client = mcpServer.getClient();

      // Handle different MCP methods
      if (method === 'tools/list') {
        const tools = await client.listTools();
        return c.json({ tools });
      } else if (method === 'tools/call') {
        if (!params?.name) {
          return c.json({ error: 'Missing tool name' }, 400);
        }

        const result = await client.callTool(
          params.name,
          params.arguments || {}
        );
        return c.json({ content: result });
      } else {
        return c.json({ error: `Unknown method: ${method}` }, 400);
      }
    } catch (error) {
      logger.error('Error handling MCP message', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: errorMessage }, 500);
    }
  });

  /**
   * Health check endpoint
   * GET /mcp/health
   */
  app.get('/mcp/health', async (c) => {
    try {
      const isConnected = await mcpServer.testConnection();
      return c.json({
        status: isConnected ? 'healthy' : 'degraded',
        upstreamConnected: isConnected,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Health check failed', error);
      return c.json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }, 500);
    }
  });

  /**
   * Get server info
   * GET /mcp/info
   */
  app.get('/mcp/info', (c) => {
    return c.json({
      name: 'js-translation-helps-proxy',
      version: '1.0.0',
      protocol: 'mcp',
      transport: 'http',
      capabilities: {
        tools: true,
      },
    });
  });

  return app;
}