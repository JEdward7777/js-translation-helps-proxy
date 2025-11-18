/**
 * Official MCP Streamable HTTP Transport implementation
 * Compatible with MCP Inspector and standard MCP clients
 * 
 * Works in both Node.js and CloudFlare Workers using fetch-to-node adapter
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { toReqRes, toFetchResponse } from 'fetch-to-node';
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
    allowHeaders: ['Content-Type', 'Authorization', 'Mcp-Session-Id', 'Last-Event-Id'],
    exposeHeaders: ['Mcp-Session-Id'],
  }));

  // Set log level
  if (config.logLevel) {
    logger.setLevel(config.logLevel);
  }

  // Create shared MCP Server instance (create once, reuse for all requests)
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
      
      // Parse request body
      const body = await c.req.json();
      
      // Convert Web Request → Node.js IncomingMessage/ServerResponse
      const { req, res } = toReqRes(c.req.raw);
      
      // Create transport (stateless mode for CloudFlare Workers compatibility)
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode
        enableJsonResponse: true, // Force JSON responses (no SSE on POST)
      });
      
      // Connect the MCP server to this transport
      await mcpServer.connect(transport);
      
      // Handle the request
      await transport.handleRequest(req, res, body);
      
      // Convert Node.js response back to Web Response for Hono/Workers
      return toFetchResponse(res);
    } catch (error) {
      logger.error('Error handling POST /mcp', error);
      return c.json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  /**
   * GET /mcp - Server streams responses (SSE)
   * Used for server-to-client notifications and streaming responses
   */
  app.get('/mcp', async (c) => {
    try {
      logger.debug('Received GET /mcp request (streaming)');
      
      // Convert Web Request → Node.js IncomingMessage/ServerResponse
      const { req, res } = toReqRes(c.req.raw);
      
      // Create transport
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode
      });
      
      // Connect the MCP server to this transport
      await mcpServer.connect(transport);
      
      // Handle the request
      await transport.handleRequest(req, res);
      
      // Convert Node.js response back to Web Response
      return toFetchResponse(res);
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
    mode: 'stateless',
    enabledTools: config.enabledTools?.length || 'all',
    hiddenParams: config.hiddenParams?.length || 'none',
    filterBookChapterNotes: config.filterBookChapterNotes,
  });

  return app;
}