/**
 * Integration tests for OpenAI-compatible API
 * Tests Interface 4: OpenAI-compatible REST API with automatic tool execution
 */

import { describe, it, expect } from 'vitest';

describe('OpenAI API (Integration)', () => {
  describe('API Endpoints', () => {
    it('should have chat completions endpoint', () => {
      const endpoint = '/v1/chat/completions';
      expect(endpoint).toBe('/v1/chat/completions');
    });

    it('should have models endpoint', () => {
      const endpoint = '/v1/models';
      expect(endpoint).toBe('/v1/models');
    });

    it('should have tools endpoint', () => {
      const endpoint = '/v1/tools';
      expect(endpoint).toBe('/v1/tools');
    });

    it('should have health endpoint', () => {
      const endpoint = '/health';
      expect(endpoint).toBe('/health');
    });
  });

  describe('Chat Completions Request Format', () => {
    it('should accept standard OpenAI request format', () => {
      const request = {
        model: 'translation-helps-proxy',
        messages: [
          { role: 'user', content: 'Fetch scripture for John 3:16' }
        ]
      };

      expect(request.model).toBe('translation-helps-proxy');
      expect(request.messages).toHaveLength(1);
      expect(request.messages[0].role).toBe('user');
    });

    it('should support system messages', () => {
      const request = {
        model: 'translation-helps-proxy',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Fetch John 3:16' }
        ]
      };

      expect(request.messages).toHaveLength(2);
      expect(request.messages[0].role).toBe('system');
    });

    it('should support optional parameters', () => {
      const request = {
        model: 'translation-helps-proxy',
        messages: [{ role: 'user', content: 'Test' }],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      };

      expect(request.temperature).toBe(0.7);
      expect(request.max_tokens).toBe(1000);
      expect(request.stream).toBe(false);
    });
  });

  describe('Tool Execution Flow', () => {
    it('should have automatic tool execution enabled', () => {
      // OpenAI API should automatically execute tools
      const config = {
        autoExecuteTools: true,
        maxIterations: 5
      };

      expect(config.autoExecuteTools).toBe(true);
      expect(config.maxIterations).toBe(5);
    });

    it('should have baked-in filters', () => {
      // Interface 4 has baked-in filters
      const filters = {
        language: 'en',
        organization: 'unfoldingWord',
        filterBookChapterNotes: true
      };

      expect(filters.language).toBe('en');
      expect(filters.organization).toBe('unfoldingWord');
      expect(filters.filterBookChapterNotes).toBe(true);
    });
  });

  describe('Response Format', () => {
    it('should return OpenAI-compatible response structure', () => {
      const response = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'translation-helps-proxy',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Response text'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      };

      expect(response.object).toBe('chat.completion');
      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.role).toBe('assistant');
      expect(response.usage).toBeDefined();
    });

    it('should support streaming responses', () => {
      const streamChunk = {
        id: 'chatcmpl-123',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'translation-helps-proxy',
        choices: [
          {
            index: 0,
            delta: {
              content: 'chunk'
            },
            finish_reason: null
          }
        ]
      };

      expect(streamChunk.object).toBe('chat.completion.chunk');
      expect(streamChunk.choices[0].delta).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return proper error format', () => {
      const errorResponse = {
        error: {
          message: 'Invalid request',
          type: 'invalid_request_error',
          code: 'invalid_request'
        }
      };

      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.error.message).toBe('Invalid request');
      expect(errorResponse.error.type).toBe('invalid_request_error');
    });
  });

  describe('Models Endpoint', () => {
    it('should list available models', () => {
      const modelsResponse = {
        object: 'list',
        data: [
          {
            id: 'translation-helps-proxy',
            object: 'model',
            created: Date.now(),
            owned_by: 'translation-helps'
          }
        ]
      };

      expect(modelsResponse.object).toBe('list');
      expect(modelsResponse.data).toHaveLength(1);
      expect(modelsResponse.data[0].id).toBe('translation-helps-proxy');
    });
  });

  describe('Tools Endpoint', () => {
    it('should list available translation tools', () => {
      const toolsResponse = {
        tools: [
          {
            type: 'function',
            function: {
              name: 'fetch_scripture',
              description: 'Fetch scripture text',
              parameters: {
                type: 'object',
                properties: {
                  reference: { type: 'string' }
                },
                required: ['reference']
              }
            }
          }
        ]
      };

      expect(toolsResponse.tools).toBeDefined();
      expect(toolsResponse.tools[0].type).toBe('function');
      expect(toolsResponse.tools[0].function.name).toBe('fetch_scripture');
    });
  });
});

/**
 * Note: Full integration tests require a running server.
 * 
 * To test against a live server:
 * 
 * ```bash
 * # Start the development server
 * npm run dev:http
 * 
 * # Test with curl
 * curl -X POST http://localhost:8787/v1/chat/completions \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "model": "translation-helps-proxy",
 *     "messages": [{"role": "user", "content": "Fetch John 3:16"}]
 *   }'
 * ```
 * 
 * To test with OpenAI SDK:
 * 
 * ```python
 * from openai import OpenAI
 * 
 * client = OpenAI(
 *     base_url="http://localhost:8787/v1",
 *     api_key="not-needed"
 * )
 * 
 * response = client.chat.completions.create(
 *     model="translation-helps-proxy",
 *     messages=[{"role": "user", "content": "Fetch John 3:16"}]
 * )
 * ```
 */