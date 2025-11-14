/**
 * Unit tests for LLM Helper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMHelper } from '../../../src/llm-helper/index.js';
import { ChatCompletionHandler } from '../../../src/openai-api/chat-completion.js';

// Mock the ChatCompletionHandler
vi.mock('../../../src/openai-api/chat-completion.js', () => {
  // Create a proper constructor function mock
  const MockChatCompletionHandler = vi.fn(function(this: any, config: any) {
    // Return the mock handler instance that will be set in beforeEach
    return mockHandlerInstance;
  });
  
  return {
    ChatCompletionHandler: MockChatCompletionHandler,
  };
});

// Store mock handler instance at module level so the mock factory can access it
let mockHandlerInstance: any;

describe('LLMHelper', () => {
  let mockHandler: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a mock handler instance
    mockHandler = {
      handleChatCompletion: vi.fn(),
      getClient: vi.fn(),
      updateConfig: vi.fn(),
    };
    
    // Update the module-level instance
    mockHandlerInstance = mockHandler;
  });

  describe('constructor', () => {
    it('should create helper with valid config', () => {
      const helper = new LLMHelper({
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      expect(helper).toBeDefined();
      expect(ChatCompletionHandler).toHaveBeenCalledWith({
        language: 'en',
        organization: 'unfoldingWord',
        maxToolIterations: 5,
        enableToolExecution: true,
        upstreamUrl: undefined,
        timeout: undefined,
      });
    });

    it('should create helper with custom config', () => {
      const helper = new LLMHelper({
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        language: 'es',
        organization: 'custom-org',
        maxToolIterations: 10,
        upstreamUrl: 'https://custom.url',
        timeout: 60000,
      });

      expect(helper).toBeDefined();
      expect(ChatCompletionHandler).toHaveBeenCalledWith({
        language: 'es',
        organization: 'custom-org',
        maxToolIterations: 10,
        enableToolExecution: true,
        upstreamUrl: 'https://custom.url',
        timeout: 60000,
      });
    });

    it('should throw error for missing API key', () => {
      expect(() => {
        new LLMHelper({
          apiKey: '',
          model: 'gpt-4o-mini',
        });
      }).toThrow('API key is required');
    });

    it('should throw error for missing model', () => {
      expect(() => {
        new LLMHelper({
          apiKey: 'test-key',
          model: '',
        });
      }).toThrow('Model is required');
    });
  });

  describe('chat', () => {
    it('should call ChatCompletionHandler and return formatted response', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4o-mini',
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

      mockHandler.handleChatCompletion.mockResolvedValue(mockResponse);

      const helper = new LLMHelper({
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const response = await helper.chat([
        { role: 'user', content: 'Hello' },
      ]);

      expect(mockHandler.handleChatCompletion).toHaveBeenCalledWith(
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
        },
        'test-key'
      );

      expect(response.message.role).toBe('assistant');
      expect(response.message.content).toBe('Hello! How can I help you?');
      expect(response.usage?.promptTokens).toBe(10);
      expect(response.usage?.completionTokens).toBe(20);
      expect(response.usage?.totalTokens).toBe(30);
    });

    it('should handle response without usage', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4o-mini',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Response',
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockHandler.handleChatCompletion.mockResolvedValue(mockResponse);

      const helper = new LLMHelper({
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const response = await helper.chat([
        { role: 'user', content: 'Hello' },
      ]);

      expect(response.usage).toBeUndefined();
    });
  });

  describe('getClient', () => {
    it('should return Translation Helps client', () => {
      const mockClient = { listTools: vi.fn() };
      mockHandler.getClient.mockReturnValue(mockClient);

      const helper = new LLMHelper({
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const client = helper.getClient();
      expect(client).toBe(mockClient);
      expect(mockHandler.getClient).toHaveBeenCalled();
    });
  });
});