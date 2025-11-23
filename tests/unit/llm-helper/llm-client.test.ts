/**
 * Unit tests for LLM Helper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMHelper } from '../../../src/llm-helper/index.js';
import { ChatCompletionHandler } from '../../../src/openai-api/chat-completion.js';

// Mock the ChatCompletionHandler
vi.mock('../../../src/openai-api/chat-completion.js', () => {
  // Create a proper constructor function mock
  const MockChatCompletionHandler = vi.fn(function(this: any, _config: any) {
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
      });

      expect(helper).toBeDefined();
      expect(helper.chat).toBeDefined();
      expect(helper.chat.completions).toBeDefined();
      expect(helper.chat.completions.create).toBeDefined();
      expect(ChatCompletionHandler).toHaveBeenCalledWith({
        enabledTools: undefined,
        hiddenParams: undefined,
        maxToolIterations: 5,
        filterBookChapterNotes: undefined,
        enableToolExecution: true,
        upstreamUrl: undefined,
        timeout: undefined,
      });
    });

    it('should create helper with custom config', () => {
      const helper = new LLMHelper({
        apiKey: 'test-key',
        enabledTools: ['fetch_scripture'],
        hiddenParams: ['language', 'organization'],
        maxToolIterations: 10,
        upstreamUrl: 'https://custom.url',
        timeout: 60000,
      });

      expect(helper).toBeDefined();
      expect(ChatCompletionHandler).toHaveBeenCalledWith({
        enabledTools: ['fetch_scripture'],
        hiddenParams: ['language', 'organization'],
        maxToolIterations: 10,
        filterBookChapterNotes: undefined,
        enableToolExecution: true,
        upstreamUrl: 'https://custom.url',
        timeout: 60000,
      });
    });

    it('should throw error for missing API key', () => {
      expect(() => {
        new LLMHelper({
          apiKey: '',
        });
      }).toThrow('API key is required');
    });
  });

  describe('chat.completions.create', () => {
    it('should call ChatCompletionHandler and return full OpenAI response', async () => {
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
      });

      const response = await helper.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(mockHandler.handleChatCompletion).toHaveBeenCalledWith(
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
        },
        'test-key'
      );

      // Should return full OpenAI response, not simplified
      expect(response.id).toBe('chatcmpl-123');
      expect(response.object).toBe('chat.completion');
      expect(response.created).toBe(1234567890);
      expect(response.model).toBe('gpt-4o-mini');
      expect(response.choices[0].message.role).toBe('assistant');
      expect(response.choices[0].message.content).toBe('Hello! How can I help you?');
      expect(response.usage?.prompt_tokens).toBe(10);
      expect(response.usage?.completion_tokens).toBe(20);
      expect(response.usage?.total_tokens).toBe(30);
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
      });

      const response = await helper.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response.usage).toBeUndefined();
    });

    it('should support n > 1 and return all choices', async () => {
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
              content: 'First response',
            },
            finish_reason: 'stop',
          },
          {
            index: 1,
            message: {
              role: 'assistant',
              content: 'Second response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 40,
          total_tokens: 50,
        },
      };

      mockHandler.handleChatCompletion.mockResolvedValue(mockResponse);

      const helper = new LLMHelper({
        apiKey: 'test-key',
      });

      const response = await helper.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
        n: 2,
      });

      // Should return all choices, not just the first one
      expect(response.choices).toHaveLength(2);
      expect(response.choices[0].message.content).toBe('First response');
      expect(response.choices[1].message.content).toBe('Second response');
    });

    it('should pass through OpenAI parameters', async () => {
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
      });

      await helper.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        top_p: 0.9,
        n: 2,
        response_format: { type: 'json_object' },
      });

      expect(mockHandler.handleChatCompletion).toHaveBeenCalledWith(
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.7,
          top_p: 0.9,
          n: 2,
          response_format: { type: 'json_object' },
        },
        'test-key'
      );
    });
  });

  describe('getClient', () => {
    it('should return Translation Helps client', () => {
      const mockClient = { listTools: vi.fn() };
      mockHandler.getClient.mockReturnValue(mockClient);

      const helper = new LLMHelper({
        apiKey: 'test-key',
      });

      const client = helper.getClient();
      expect(client).toBe(mockClient);
      expect(mockHandler.getClient).toHaveBeenCalled();
    });
  });
});