/**
 * Unified HTTP server combining MCP HTTP and OpenAI-compatible API
 * Runs both Interface 2 (MCP) and Interface 4 (OpenAI) in a single Hono process
 */

import { Hono } from 'hono';
import { logger } from '../shared/index.js';
import { createMCPRoutes } from '../mcp-server/index.js';
import { createOpenAIRoutes } from './routes.js';

export interface UnifiedServerConfig {
  // MCP server config (Interface 2) - client-controlled filters
  mcp?: {
    enabledTools?: string[];
    hiddenParams?: string[];
    filterBookChapterNotes?: boolean;
  };
  
  // OpenAI API config (Interface 4) - now uses same filter approach as Interface 3.5
  openai?: {
    enabledTools?: string[]; // Limit which tools are available
    hiddenParams?: string[]; // Hide parameters from LLM (e.g., ['language', 'organization'])
    filterBookChapterNotes?: boolean; // Default: true
    maxToolIterations?: number;
    enableToolExecution?: boolean;
  };
  
  // Shared config
  upstreamUrl?: string;
  timeout?: number;
  port?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Create unified HTTP server with both MCP and OpenAI interfaces
 */
export function createUnifiedServer(config: UnifiedServerConfig = {}): Hono {
  // Set log level
  if (config.logLevel) {
    logger.setLevel(config.logLevel);
  }

  const app = new Hono();

  logger.info('Initializing unified HTTP server', {
    mcpEnabled: true,
    openaiEnabled: true,
    upstreamUrl: config.upstreamUrl || 'default',
  });

  // Mount MCP routes (Interface 2)
  // Client-controlled filters via query parameters or config
  const mcpRoutes = createMCPRoutes({
    enabledTools: config.mcp?.enabledTools,
    hiddenParams: config.mcp?.hiddenParams,
    filterBookChapterNotes: config.mcp?.filterBookChapterNotes,
  });
  app.route('/', mcpRoutes);

  logger.info('MCP HTTP interface mounted', {
    endpoints: ['/mcp/message', '/mcp/health', '/mcp/info'],
  });

  // Mount OpenAI routes (Interface 4)
  // Now uses FilterEngine like Interface 3.5
  const openaiRoutes = createOpenAIRoutes({
    enabledTools: config.openai?.enabledTools,
    hiddenParams: config.openai?.hiddenParams,
    filterBookChapterNotes: config.openai?.filterBookChapterNotes ?? true,
    maxToolIterations: config.openai?.maxToolIterations || 5,
    enableToolExecution: config.openai?.enableToolExecution ?? true,
    upstreamUrl: config.upstreamUrl,
    timeout: config.timeout,
  });
  app.route('/', openaiRoutes);

  logger.info('OpenAI-compatible API interface mounted', {
    endpoints: ['/v1/chat/completions', '/v1/models', '/v1/tools', '/health'],
    filters: {
      enabledTools: config.openai?.enabledTools?.length || 'all',
      hiddenParams: config.openai?.hiddenParams?.length || 'none',
      filterBookChapterNotes: config.openai?.filterBookChapterNotes ?? true,
    },
  });

  // Root endpoint
  app.get('/', (c) => {
    return c.json({
      name: 'js-translation-helps-proxy',
      version: '1.0.0',
      description: 'Unified HTTP server with MCP and OpenAI-compatible interfaces',
      interfaces: {
        mcp: {
          description: 'MCP HTTP server with client-controlled filters',
          endpoints: {
            message: '/mcp/message',
            health: '/mcp/health',
            info: '/mcp/info',
          },
        },
        openai: {
          description: 'OpenAI-compatible API with configurable filters',
          endpoints: {
            chatCompletions: '/v1/chat/completions',
            models: '/v1/models',
            tools: '/v1/tools',
            health: '/health',
            info: '/v1/info',
          },
          filters: {
            enabledTools: config.openai?.enabledTools?.length || 'all',
            hiddenParams: config.openai?.hiddenParams?.length || 'none',
            filterBookChapterNotes: config.openai?.filterBookChapterNotes ?? true,
          },
        },
      },
      documentation: 'https://github.com/yourusername/js-translation-helps-proxy',
    });
  });

  logger.info('Unified HTTP server initialized successfully');

  return app;
}

/**
 * Start the unified server (for standalone use)
 */
export async function startServer(config: UnifiedServerConfig = {}): Promise<void> {
  const app = createUnifiedServer(config);
  const port = config.port || 8000;

  logger.info(`Starting unified HTTP server on port ${port}`);
  logger.info('Use wrangler dev or deploy to CloudFlare Workers');
  logger.info('For local Node.js development, use: npm run start:http');
}

// Export types and utilities
export { createMCPRoutes } from '../mcp-server/index.js';
export { createOpenAIRoutes } from './routes.js';
export { ChatCompletionHandler } from './chat-completion.js';
export * from './types.js';
export * from './tool-mapper.js';

// Default export for CloudFlare Workers
export default {
  async fetch(request: Request, env: any, ctx: any) {
    const config: UnifiedServerConfig = {
      upstreamUrl: env.UPSTREAM_URL,
      timeout: env.TIMEOUT ? parseInt(env.TIMEOUT) : undefined,
      logLevel: env.LOG_LEVEL as any,
      openai: {
        enabledTools: env.OPENAI_ENABLED_TOOLS ? env.OPENAI_ENABLED_TOOLS.split(',') : undefined,
        hiddenParams: env.OPENAI_HIDDEN_PARAMS ? env.OPENAI_HIDDEN_PARAMS.split(',') : undefined,
        filterBookChapterNotes: env.OPENAI_FILTER_NOTES !== 'false',
        maxToolIterations: env.OPENAI_MAX_ITERATIONS ? parseInt(env.OPENAI_MAX_ITERATIONS) : 5,
      },
    };

    const app = createUnifiedServer(config);
    return app.fetch(request, env, ctx);
  },
};