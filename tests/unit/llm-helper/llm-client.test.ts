/**
 * Unit tests for LLM Client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMClient } from '../../../src/llm-helper/llm-client.js';
import { LLMProviderError, InvalidConfigError } from '../../../src/llm-helper/types.js';

// Mock fetch globally
globalThis.fetch = vi.fn() as any;

describe('LLMClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with valid OpenAI config', () => {
      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      expect(client.getProvider()).toBe('openai');
      expect(client.getModel()).toBe('gpt-4');
    });

    it('should create client with valid Anthropic config', () => {
      const client = new LLMClient({
        provider: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-3-opus-20240229',
      });

      expect(client.getProvider()).toBe('anthropic');
      expect(client.getModel()).toBe('claude-3-opus-20240229');
    });

    it('should throw error for missing provider', () => {
      expect(() => {
        new LLMClient({
          provider: '' as any,
          apiKey: 'test-key',
          model: 'gpt-4',
        });
      }).toThrow(InvalidConfigError);
    });

    it('should throw error for invalid provider', () => {
      expect(() => {
        new LLMClient({
          provider: 'invalid' as any,
          apiKey: 'test-key',
          model: 'gpt-4',
        });
      }).toThrow(InvalidConfigError);
    });

    it('should throw error for missing API key', () => {
      expect(() => {
        new LLMClient({
          provider: 'openai',
          apiKey: '',
          model: 'gpt-4',
        });
      }).toThrow(InvalidConfigError);
    });

    it('should throw error for missing model', () => {
      expect(() => {
        new LLMClient({
          provider: 'openai',
          apiKey: 'test-key',
          model: '',
        });
      }).toThrow(InvalidConfigError);
    });
  });

  describe('chat - OpenAI', () => {
    it('should make successful chat request', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you?',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      const response = await client.chat([
        { role: 'user', content: 'Hello' },
      ]);

      expect(response.message.content).toBe('Hello! How can I help you?');
      expect(response.finishReason).toBe('stop');
      expect(response.usage?.totalTokens).toBe(30);
    });

    it('should handle tool calls in response', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4',
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
                    arguments: '{"reference":"John 3:16"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      const response = await client.chat([
        { role: 'user', content: 'Fetch John 3:16' },
      ]);

      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls?.length).toBe(1);
      expect(response.toolCalls?.[0].name).toBe('fetch_scripture');
      expect(response.toolCalls?.[0].arguments).toEqual({ reference: 'John 3:16' });
    });

    it('should handle API errors', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: {
            message: 'Invalid API key',
          },
        }),
      });

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'invalid-key',
        model: 'gpt-4',
      });

      await expect(client.chat([
        { role: 'user', content: 'Hello' },
      ])).rejects.toThrow(LLMProviderError);
    });

    it('should handle timeout', async () => {
      (globalThis.fetch as any).mockImplementationOnce(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        })
      );

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
        timeout: 50,
      });

      await expect(client.chat([
        { role: 'user', content: 'Hello' },
      ])).rejects.toThrow();
    });
  });

  describe('chat - Anthropic', () => {
    it('should make successful chat request', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Hello! How can I help you?',
          },
        ],
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new LLMClient({
        provider: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-3-opus-20240229',
      });

      const response = await client.chat([
        { role: 'user', content: 'Hello' },
      ]);

      expect(response.message.content).toBe('Hello! How can I help you?');
      expect(response.finishReason).toBe('stop');
      expect(response.usage?.totalTokens).toBe(30);
    });

    it('should handle system messages', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new LLMClient({
        provider: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-3-opus-20240229',
      });

      await client.chat([
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' },
      ]);

      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.system).toBe('You are a helpful assistant');
      expect(body.messages.length).toBe(1);
      expect(body.messages[0].role).toBe('user');
    });

    it('should handle tool use in response', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'toolu_123',
            name: 'fetch_scripture',
            input: { reference: 'John 3:16' },
          },
        ],
        model: 'claude-3-opus-20240229',
        stop_reason: 'tool_use',
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new LLMClient({
        provider: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-3-opus-20240229',
      });

      const response = await client.chat([
        { role: 'user', content: 'Fetch John 3:16' },
      ]);

      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls?.length).toBe(1);
      expect(response.toolCalls?.[0].name).toBe('fetch_scripture');
      expect(response.toolCalls?.[0].arguments).toEqual({ reference: 'John 3:16' });
    });
  });
});