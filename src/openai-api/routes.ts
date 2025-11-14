/**
 * Hono routes for OpenAI-compatible API
 * Provides /v1/chat/completions and /v1/models endpoints
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import OpenAI from 'openai';
import { ChatCompletionHandler } from './chat-completion.js';
import { OpenAIBridgeConfig, ChatCompletionRequest, OpenAIAPIError } from './types.js';
import { mcpToolsToOpenAI } from './tool-mapper.js';
import { logger } from '../shared/index.js';

/**
 * Extract API key from Authorization header
 */
function extractApiKey(authHeader: string | undefined): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new OpenAIAPIError(
      'Missing or invalid Authorization header. Expected: Authorization: Bearer sk-...',
      401,
      'invalid_request_error'
    );
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Create Hono routes for OpenAI API
 */
export function createOpenAIRoutes(config: OpenAIBridgeConfig = {}): Hono {
  const app = new Hono();

  // Apply CORS middleware
  app.use('/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }));

  // Create chat completion handler with filter configuration
  const handler = new ChatCompletionHandler({
    enabledTools: config.enabledTools,
    hiddenParams: config.hiddenParams,
    filterBookChapterNotes: config.filterBookChapterNotes ?? true,
    maxToolIterations: config.maxToolIterations || 5,
    enableToolExecution: config.enableToolExecution ?? true,
    upstreamUrl: config.upstreamUrl,
    timeout: config.timeout,
  });

  /**
   * POST /v1/chat/completions
   * Main chat completion endpoint - proxies to OpenAI with tool injection
   */
  app.post('/v1/chat/completions', async (c) => {
    try {
      // Extract API key from Authorization header
      const authHeader = c.req.header('Authorization');
      const apiKey = extractApiKey(authHeader);

      const body = await c.req.json() as ChatCompletionRequest;
      
      logger.debug('Received chat completion request', {
        model: body.model,
        messageCount: body.messages?.length,
      });

      // Handle the request with user's API key
      const response = await handler.handleChatCompletion(body, apiKey);

      return c.json(response);
    } catch (error) {
      logger.error('Error in chat completion endpoint', error);

      if (error instanceof OpenAIAPIError) {
        return c.json(error.toJSON(), error.statusCode as any);
      }

      return c.json({
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          type: 'internal_error',
        },
      }, 500);
    }
  });

  /**
   * GET /v1/models
   * List available models - proxies to OpenAI's models endpoint
   */
  app.get('/v1/models', async (c) => {
    try {
      // Extract API key from Authorization header
      const authHeader = c.req.header('Authorization');
      const apiKey = extractApiKey(authHeader);

      // Proxy to OpenAI's models endpoint
      const openai = new OpenAI({ apiKey });
      const models = await openai.models.list();

      return c.json(models);
    } catch (error) {
      logger.error('Error listing models', error);

      if (error instanceof OpenAIAPIError) {
        return c.json(error.toJSON(), error.statusCode as any);
      }

      // Handle OpenAI SDK errors
      if (error && typeof error === 'object' && 'status' in error) {
        const openaiError = error as any;
        return c.json({
          error: {
            message: openaiError.message || 'OpenAI API error',
            type: openaiError.type || 'api_error',
          },
        }, openaiError.status || 500);
      }

      return c.json({
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          type: 'internal_error',
        },
      }, 500);
    }
  });

  /**
   * GET /v1/tools
   * List available tools (custom endpoint)
   */
  app.get('/v1/tools', async (c) => {
    try {
      const client = handler.getClient();
      const mcpTools = await client.listTools();
      const openaiTools = mcpToolsToOpenAI(mcpTools);

      return c.json({
        object: 'list',
        data: openaiTools,
      });
    } catch (error) {
      logger.error('Error listing tools', error);
      return c.json({
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          type: 'internal_error',
        },
      }, 500);
    }
  });

  /**
   * GET /health
   * Health check endpoint
   */
  app.get('/health', async (c) => {
    try {
      const client = handler.getClient();
      const isConnected = await client.testConnection();

      return c.json({
        status: isConnected ? 'healthy' : 'degraded',
        upstreamConnected: isConnected,
        timestamp: new Date().toISOString(),
        config: {
          enabledTools: config.enabledTools?.length || 'all',
          hiddenParams: config.hiddenParams?.length || 'none',
          filterBookChapterNotes: config.filterBookChapterNotes ?? true,
        },
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
   * GET /v1/info
   * Get API information
   */
  app.get('/v1/info', (c) => {
    return c.json({
      name: 'translation-helps-openai-proxy',
      version: '1.0.0',
      api: 'openai-compatible',
      description: 'OpenAI API proxy with automatic Translation Helps tool injection',
      capabilities: {
        chat_completions: true,
        tool_calling: true,
        streaming: false,
        models_proxy: true,
      },
      config: {
        enabledTools: config.enabledTools?.length || 'all',
        hiddenParams: config.hiddenParams?.length || 'none',
        filterBookChapterNotes: config.filterBookChapterNotes ?? true,
        maxToolIterations: config.maxToolIterations || 5,
      },
    });
  });

  return app;
}