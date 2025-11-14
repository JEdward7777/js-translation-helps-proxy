/**
 * LLM Helper - Simplified wrapper around OpenAI API with Translation Helps tools
 * Uses Interface 4's ChatCompletionHandler for consistent OpenAI integration
 */

import { ChatCompletionHandler } from '../openai-api/chat-completion.js';
import { TranslationHelpsClient } from '../core/index.js';

export interface LLMHelperConfig {
  apiKey: string;
  model: string;
  enabledTools?: string[];
  hiddenParams?: string[];
  maxToolIterations?: number;
  upstreamUrl?: string;
  timeout?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: ChatMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM Helper - Simplified wrapper around OpenAI API with Translation Helps tools
 */
export class LLMHelper {
  private handler: ChatCompletionHandler;
  private apiKey: string;
  private model: string;

  constructor(config: LLMHelperConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
    if (!config.model) {
      throw new Error('Model is required');
    }

    this.apiKey = config.apiKey;
    this.model = config.model;

    // Reuse Interface 4's ChatCompletionHandler
    // Defaults are applied in ChatCompletionHandler constructor
    this.handler = new ChatCompletionHandler({
      enabledTools: config.enabledTools,
      hiddenParams: config.hiddenParams,
      maxToolIterations: config.maxToolIterations || 5,
      enableToolExecution: true,
      upstreamUrl: config.upstreamUrl,
      timeout: config.timeout,
    });
  }

  /**
   * Send a chat request with automatic tool execution
   */
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    // Convert to OpenAI request format
    const request = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    };

    // Use Interface 4's handler
    const response = await this.handler.handleChatCompletion(request, this.apiKey);

    // Convert response to simplified format
    return {
      message: {
        role: 'assistant',
        content: response.choices[0].message.content || '',
      },
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  }

  /**
   * Get the Translation Helps client for direct tool access
   */
  getClient(): TranslationHelpsClient {
    return this.handler.getClient();
  }
}

// Re-export types for convenience
export * from './types.js';