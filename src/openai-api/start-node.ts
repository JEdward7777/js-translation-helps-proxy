#!/usr/bin/env node
/**
 * Node.js entry point for running the Hono server natively (without Wrangler)
 * This allows for local development and debugging with VSCode breakpoints
 */

import { serve } from '@hono/node-server';
import { createUnifiedServer } from './index.js';
import { logger } from '../shared/logger.js';

// Configuration from environment variables
const config = {
  upstreamUrl: process.env.UPSTREAM_URL || 'https://translation-helps-mcp.pages.dev/api/mcp',
  timeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 30000,
  logLevel: (process.env.LOG_LEVEL || 'debug') as 'debug' | 'info' | 'warn' | 'error',
  openai: {
    language: process.env.OPENAI_LANGUAGE || 'en',
    organization: process.env.OPENAI_ORGANIZATION || 'unfoldingWord',
    filterBookChapterNotes: process.env.OPENAI_FILTER_NOTES !== 'false',
    maxToolIterations: process.env.OPENAI_MAX_ITERATIONS ? parseInt(process.env.OPENAI_MAX_ITERATIONS) : 5,
  },
};

// Create the unified server
const app = createUnifiedServer(config);

// Start the server
const port = process.env.PORT ? parseInt(process.env.PORT) : 8787;

logger.info('Starting Node.js HTTP server', {
  port,
  upstreamUrl: config.upstreamUrl,
  logLevel: config.logLevel,
});

serve({
  fetch: app.fetch,
  port,
});

logger.info(`Server running at http://localhost:${port}`);
logger.info('Available endpoints:');
logger.info('  - GET  /                      - Server info');
logger.info('  - GET  /health                - Health check');
logger.info('  - GET  /mcp/sse               - MCP SSE endpoint');
logger.info('  - POST /mcp/message           - MCP HTTP endpoint');
logger.info('  - GET  /mcp/health            - MCP health check');
logger.info('  - GET  /mcp/info              - MCP server info');
logger.info('  - POST /v1/chat/completions   - OpenAI-compatible chat completions');
logger.info('  - GET  /v1/models             - List available models');
logger.info('  - GET  /v1/tools              - List available tools');
logger.info('  - GET  /v1/info               - OpenAI API info');