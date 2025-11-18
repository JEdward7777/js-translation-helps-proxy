/**
 * Official MCP Streamable HTTP Transport implementation
 * Compatible with MCP Inspector and standard MCP clients
 *
 * Note: This uses the existing server.ts handlers to avoid code duplication
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { SSEMCPServer } from './server.js';
import { logger } from '../shared/index.js';
import { IncomingMessage, ServerResponse } from 'node:http';

export interface StreamableTransportConfig {
  enabledTools?: string[];
  hiddenParams?: string[];
  filterBookChapterNotes?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Convert Hono Request to Node.js IncomingMessage-like object
 */
function createIncomingMessage(honoReq: Request, body?: unknown): IncomingMessage {
  const url = new URL(honoReq.url);
  const headers: Record<string, string | string[]> = {};
  honoReq.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  // Create a minimal IncomingMessage-like object
  const req = {
    method: honoReq.method,
    url: url.pathname + url.search,
    headers,
    body,
  } as unknown as IncomingMessage;

  return req;
}

/**
 * Create Hono routes for official MCP Streamable HTTP transport
 * Mounts at /mcp (POST + GET + DELETE)
 */
export function createStreamableMCPRoutes(config: StreamableTransportConfig = {}): Hono {
  const app = new Hono();

  // Apply CORS middleware
  app.use('/mcp', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Mcp-Session-Id', 'Last-Event-Id'],
    exposeHeaders: ['Mcp-Session-Id'],
  }));

  // Set log level
  if (config.logLevel) {
    logger.setLevel(config.logLevel);
  }

  // Map to store transports by session ID
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  /**
   * POST /mcp - Client sends JSON-RPC requests
   * This is the main endpoint for MCP communication
   */
  app.post('/mcp', async (c) => {
    try {
      const sessionId = c.req.header('mcp-session-id');
      const body = await c.req.json();
      
      logger.debug('Received POST /mcp request', { sessionId, method: body?.method });

      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        transport = transports[sessionId];
        logger.debug(`Reusing transport for session: ${sessionId}`);
      } else if (!sessionId && isInitializeRequest(body)) {
        // New initialization request - create new transport
        logger.debug('Creating new transport for initialization');
        
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            logger.info(`Session initialized with ID: ${sid}`);
            transports[sid] = transport;
          },
        });

        // Set up onclose handler to clean up transport
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            logger.info(`Transport closed for session ${sid}`);
            delete transports[sid];
          }
        };

        // Create MCP server and connect transport
        const mcpServer = new SSEMCPServer(config);
        await mcpServer.getServer().connect(transport);
      } else {
        // Invalid request
        logger.warn('Invalid request: no session ID or not initialization request');
        return c.json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        }, 400);
      }

      // Convert Hono request to Node.js-style request/response
      const req = createIncomingMessage(c.req.raw, body);
      
      // Create a response object that captures the result
      interface ResponseData {
        status: number;
        headers: Record<string, string>;
        body: string;
        headersSent?: boolean;
      }
      
      let responseData: ResponseData = { status: 200, headers: {}, body: '' };
      
      const res = {
        statusCode: 200,
        headersSent: false,
        setHeader: (name: string, value: string) => {
          responseData.headers[name] = value;
        },
        writeHead: (status: number, headers?: Record<string, string>) => {
          responseData.status = status;
          if (headers) {
            Object.assign(responseData.headers, headers);
          }
        },
        write: (chunk: string) => {
          responseData.body += chunk;
        },
        end: (data?: string) => {
          if (data) {
            responseData.body += data;
          }
          responseData.headersSent = true;
        },
      } as unknown as ServerResponse;

      // Handle the request
      await transport.handleRequest(req, res, body);

      // Return the response
      return new Response(responseData.body, {
        status: responseData.status,
        headers: responseData.headers,
      });
    } catch (error) {
      logger.error('Error handling POST /mcp', error);
      return c.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }, 500);
    }
  });

  /**
   * GET /mcp - Server streams responses (SSE)
   * Used for server-to-client notifications and streaming responses
   */
  app.get('/mcp', async (c) => {
    try {
      const sessionId = c.req.header('mcp-session-id');
      
      if (!sessionId || !transports[sessionId]) {
        logger.warn('Invalid or missing session ID for GET request');
        return c.text('Invalid or missing session ID', 400);
      }

      logger.debug(`Establishing SSE stream for session ${sessionId}`);

      const transport = transports[sessionId];
      const req = createIncomingMessage(c.req.raw);
      
      // Create a streaming response
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      const res = {
        statusCode: 200,
        headersSent: false,
        setHeader: () => {},
        writeHead: () => {},
        write: (chunk: string) => {
          writer.write(encoder.encode(chunk));
        },
        end: () => {
          writer.close();
        },
      } as unknown as ServerResponse;

      // Handle the request asynchronously
      transport.handleRequest(req, res).catch((error) => {
        logger.error('Error in SSE stream', error);
        writer.close();
      });

      return new Response(readable, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (error) {
      logger.error('Error handling GET /mcp', error);
      return c.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }, 500);
    }
  });

  /**
   * DELETE /mcp - Terminate session
   */
  app.delete('/mcp', async (c) => {
    try {
      const sessionId = c.req.header('mcp-session-id');
      
      if (!sessionId || !transports[sessionId]) {
        logger.warn('Invalid or missing session ID for DELETE request');
        return c.text('Invalid or missing session ID', 400);
      }

      logger.info(`Received session termination request for session ${sessionId}`);

      const transport = transports[sessionId];
      const req = createIncomingMessage(c.req.raw);
      
      let responseData: { status: number; body: string } = { status: 200, body: '' };
      const res = {
        statusCode: 200,
        headersSent: false,
        setHeader: () => {},
        writeHead: (status: number) => {
          responseData.status = status;
        },
        write: (chunk: string) => {
          responseData.body += chunk;
        },
        end: (data?: string) => {
          if (data) responseData.body += data;
        },
      } as unknown as ServerResponse;

      await transport.handleRequest(req, res);

      return new Response(responseData.body, { status: responseData.status });
    } catch (error) {
      logger.error('Error handling DELETE /mcp', error);
      return c.text('Error processing session termination', 500);
    }
  });

  logger.info('Streamable MCP HTTP transport initialized', {
    endpoints: ['POST /mcp', 'GET /mcp', 'DELETE /mcp'],
    enabledTools: config.enabledTools?.length || 'all',
    hiddenParams: config.hiddenParams?.length || 'none',
    filterBookChapterNotes: config.filterBookChapterNotes,
  });

  return app;
}