/**
 * Hono routes for OpenAI-compatible API
 * Provides /v1/chat/completions and /v1/models endpoints
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ChatCompletionHandler } from './chat-completion.js';
import { OpenAIBridgeConfig, ChatCompletionRequest, OpenAIAPIError } from './types.js';
import { mcpToolsToOpenAI } from './tool-mapper.js';
import { logger } from '../shared/index.js';

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

  // Create chat completion handler with baked-in filters
  const handler = new ChatCompletionHandler({
    language: config.language || 'en',
    filterBookChapterNotes: config.filterBookChapterNotes ?? true,
    organization: config.organization || 'unfoldingWord',
    maxToolIterations: config.maxToolIterations || 5,
    enableToolExecution: config.enableToolExecution ?? true,
    upstreamUrl: config.upstreamUrl,
    timeout: config.timeout,
  });

  /**
   * POST /v1/chat/completions
   * Main chat completion endpoint
   */
  app.post('/v1/chat/completions', async (c) => {
    try {
      const body = await c.req.json() as ChatCompletionRequest;
      
      logger.debug('Received chat completion request', {
        model: body.model,
        messageCount: body.messages?.length,
      });

      // Handle the request
      const response = await handler.handleChatCompletion(body);

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
   * List available models
   */
  app.get('/v1/models', async (c) => {
    try {
      // Return a list of "models" (actually just our proxy)
      return c.json({
        object: 'list',
        data: [
          {
            id: 'translation-helps-proxy',
            object: 'model',
            created: Math.floor(Date.now() / 1000),
            owned_by: 'translation-helps',
          },
        ],
      });
    } catch (error) {
      logger.error('Error listing models', error);
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
          language: config.language || 'en',
          organization: config.organization || 'unfoldingWord',
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
      name: 'translation-helps-openai-bridge',
      version: '1.0.0',
      api: 'openai-compatible',
      capabilities: {
        chat_completions: true,
        tool_calling: true,
        streaming: false,
      },
      config: {
        language: config.language || 'en',
        organization: config.organization || 'unfoldingWord',
        filterBookChapterNotes: config.filterBookChapterNotes ?? true,
        maxToolIterations: config.maxToolIterations || 5,
      },
    });
  });

  return app;
}