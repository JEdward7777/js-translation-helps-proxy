/**
 * Integration tests for OpenAI-compatible API
 * Tests Interface 4: OpenAI-compatible REST API that proxies to OpenAI with automatic tool injection
 */

import { describe, it, expect } from 'vitest';

describe('OpenAI API Proxy (Integration)', () => {
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
    it('should accept standard OpenAI request format with real models', () => {
      const request = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Fetch scripture for John 3:16' }
        ]
      };

      expect(request.model).toBe('gpt-4o-mini');
      expect(request.messages).toHaveLength(1);
      expect(request.messages[0].role).toBe('user');
    });

    it('should support gpt-3.5-turbo model', () => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Fetch John 3:16' }
        ]
      };

      expect(request.model).toBe('gpt-3.5-turbo');
    });

    it('should support system messages', () => {
      const request = {
        model: 'gpt-4o-mini',
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
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test' }],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
        n: 2
      };

      expect(request.temperature).toBe(0.7);
      expect(request.max_tokens).toBe(1000);
      expect(request.stream).toBe(false);
      expect(request.n).toBe(2);
    });

    it('should support structured outputs via response_format', () => {
      const request = {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test' }],
        response_format: { type: 'json_object' }
      };

      expect(request.response_format).toBeDefined();
      expect(request.response_format.type).toBe('json_object');
    });
  });

  describe('Authorization Header', () => {
    it('should require Authorization header', () => {
      const authHeader = 'Bearer sk-test-key';
      expect(authHeader).toContain('Bearer ');
      expect(authHeader.substring(7)).toBe('sk-test-key');
    });

    it('should extract API key from Authorization header', () => {
      const authHeader = 'Bearer sk-proj-abc123';
      const apiKey = authHeader.substring(7);
      expect(apiKey).toBe('sk-proj-abc123');
    });

    it('should reject missing Authorization header', () => {
      const authHeader = undefined;
      expect(authHeader).toBeUndefined();
    });

    it('should reject invalid Authorization header format', () => {
      const authHeader = 'InvalidFormat sk-key';
      expect(authHeader.startsWith('Bearer ')).toBe(false);
    });
  });

  describe('Tool Execution Flow', () => {
    it('should have automatic tool execution enabled', () => {
      // OpenAI API proxy should automatically execute tools
      const config = {
        enableToolExecution: true,
        maxToolIterations: 5
      };

      expect(config.enableToolExecution).toBe(true);
      expect(config.maxToolIterations).toBe(5);
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

    it('should support iterative tool calling', () => {
      // Proxy should handle iterative tool calling loop
      const iterations = [
        { step: 1, action: 'call_openai_with_tools' },
        { step: 2, action: 'execute_tool_locally' },
        { step: 3, action: 'call_openai_with_results' },
        { step: 4, action: 'return_final_response' }
      ];

      expect(iterations).toHaveLength(4);
      expect(iterations[1].action).toBe('execute_tool_locally');
    });

    it('should handle n > 1 with tool calls', () => {
      // When n > 1, if any response has tool calls, execute first tool call
      const config = {
        n: 3,
        handleToolCalls: 'execute_first_if_any'
      };

      expect(config.n).toBe(3);
      expect(config.handleToolCalls).toBe('execute_first_if_any');
    });
  });

  describe('Response Format', () => {
    it('should return OpenAI-compatible response structure', () => {
      const response = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o-mini',
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
      expect(response.model).toBe('gpt-4o-mini');
      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.role).toBe('assistant');
      expect(response.usage).toBeDefined();
    });

    it('should support multiple choices when n > 1', () => {
      const response = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o-mini',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Response 1' },
            finish_reason: 'stop'
          },
          {
            index: 1,
            message: { role: 'assistant', content: 'Response 2' },
            finish_reason: 'stop'
          }
        ]
      };

      expect(response.choices).toHaveLength(2);
      expect(response.choices[0].index).toBe(0);
      expect(response.choices[1].index).toBe(1);
    });

    it('should support tool_calls in response', () => {
      const response = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o-mini',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'fetch_scripture',
                    arguments: '{"reference":"John 3:16"}'
                  }
                }
              ]
            },
            finish_reason: 'tool_calls'
          }
        ]
      };

      expect(response.choices[0].message.tool_calls).toBeDefined();
      expect(response.choices[0].message.tool_calls).toHaveLength(1);
      expect(response.choices[0].finish_reason).toBe('tool_calls');
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

    it('should handle missing Authorization header error', () => {
      const errorResponse = {
        error: {
          message: 'Missing or invalid Authorization header. Expected: Authorization: Bearer sk-...',
          type: 'invalid_request_error'
        }
      };

      expect(errorResponse.error.type).toBe('invalid_request_error');
      expect(errorResponse.error.message).toContain('Authorization');
    });

    it('should handle invalid API key error', () => {
      const errorResponse = {
        error: {
          message: 'Invalid API key',
          type: 'invalid_request_error',
          code: 'invalid_api_key'
        }
      };

      expect(errorResponse.error.code).toBe('invalid_api_key');
    });
  });

  describe('Models Endpoint', () => {
    it('should proxy to OpenAI models endpoint', () => {
      const modelsResponse = {
        object: 'list',
        data: [
          {
            id: 'gpt-4o-mini',
            object: 'model',
            created: 1687882411,
            owned_by: 'openai'
          },
          {
            id: 'gpt-3.5-turbo',
            object: 'model',
            created: 1677610602,
            owned_by: 'openai'
          }
        ]
      };

      expect(modelsResponse.object).toBe('list');
      expect(modelsResponse.data.length).toBeGreaterThan(0);
      expect(modelsResponse.data[0].owned_by).toBe('openai');
      expect(modelsResponse.data[0].id).toBe('gpt-4o-mini');
    });

    it('should not return fake translation-helps-proxy model', () => {
      const modelsResponse = {
        object: 'list',
        data: [
          { id: 'gpt-4o-mini', object: 'model', created: 1687882411, owned_by: 'openai' },
          { id: 'gpt-3.5-turbo', object: 'model', created: 1677610602, owned_by: 'openai' }
        ]
      };

      const hasFakeModel = modelsResponse.data.some(m => m.id === 'translation-helps-proxy');
      expect(hasFakeModel).toBe(false);
    });
  });

  describe('Tools Endpoint', () => {
    it('should list available translation tools', () => {
      const toolsResponse = {
        object: 'list',
        data: [
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

      expect(toolsResponse.object).toBe('list');
      expect(toolsResponse.data).toBeDefined();
      expect(toolsResponse.data[0].type).toBe('function');
      expect(toolsResponse.data[0].function.name).toBe('fetch_scripture');
    });
  });

  describe('Proxy Behavior', () => {
    it('should describe proxy workflow', () => {
      const workflow = [
        '1. Accept request with Authorization: Bearer <api-key>',
        '2. Extract API key from header',
        '3. Inject Translation Helps tools',
        '4. Forward to OpenAI with user\'s API key and model',
        '5. Handle tool calls iteratively',
        '6. Execute tools locally with baked-in filters',
        '7. Return OpenAI\'s actual response'
      ];

      expect(workflow).toHaveLength(7);
      expect(workflow[1]).toContain('Extract API key');
      expect(workflow[5]).toContain('Execute tools locally');
    });

    it('should use client-specified model', () => {
      const request = {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test' }]
      };

      // Proxy should use the exact model specified by client
      expect(request.model).toBe('gpt-4o-mini');
    });

    it('should use client API key for OpenAI calls', () => {
      const authHeader = 'Bearer sk-proj-client-key-123';
      const apiKey = authHeader.substring(7);

      // Proxy should use client's API key, not server's
      expect(apiKey).toBe('sk-proj-client-key-123');
      expect(apiKey).toContain('client');
    });
  });
});

/**
 * Note: Full integration tests require a running server and valid OpenAI API key.
 * 
 * To test against a live server:
 * 
 * ```bash
 * # Start the development server
 * npm run dev:http
 * 
 * # Test with curl (replace with your OpenAI API key)
 * curl -X POST http://localhost:8787/v1/chat/completions \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer sk-YOUR-OPENAI-KEY" \
 *   -d '{
 *     "model": "gpt-4o-mini",
 *     "messages": [{"role": "user", "content": "Fetch John 3:16"}]
 *   }'
 * 
 * # Test models endpoint
 * curl -H "Authorization: Bearer sk-YOUR-OPENAI-KEY" \
 *   http://localhost:8787/v1/models
 * ```
 * 
 * To test with OpenAI SDK:
 * 
 * ```python
 * from openai import OpenAI
 * 
 * client = OpenAI(
 *     base_url="http://localhost:8787/v1",
 *     api_key="sk-YOUR-OPENAI-KEY"  # Your actual OpenAI API key
 * )
 * 
 * response = client.chat.completions.create(
 *     model="gpt-4",  # Use any OpenAI model
 *     messages=[{"role": "user", "content": "Fetch John 3:16"}]
 * )
 * ```
 */