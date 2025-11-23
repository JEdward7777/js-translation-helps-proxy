/**
 * LLM Helper - Drop-in replacement for OpenAI client with Translation Helps tools
 * Implements the same interface as OpenAI for seamless interchangeability
 */

import OpenAI from 'openai';
import { ChatCompletionHandler } from '../openai-api/chat-completion.js';
import { TranslationHelpsClient } from '../core/index.js';

export interface LLMHelperConfig {
  apiKey: string;
  enabledTools?: string[];
  hiddenParams?: string[];
  maxToolIterations?: number;
  filterBookChapterNotes?: boolean;
  upstreamUrl?: string;
  timeout?: number;
}

/**
 * Drop-in replacement for OpenAI client with Translation Helps tools
 * Implements the same interface as OpenAI for seamless interchangeability
 * 
 * @example
 * ```typescript
 * // Can be used exactly like OpenAI client
 * const client = new LLMHelper({ apiKey: process.env.OPENAI_API_KEY });
 * const response = await client.chat.completions.create({
 *   model: 'gpt-4o-mini',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * console.log(response.choices[0].message.content);
 * ```
 */
export class LLMHelper {
  private handler: ChatCompletionHandler;
  private apiKey: string;
  
  /**
   * Expose the same structure as OpenAI client
   * This allows LLMHelper to be a drop-in replacement
   */
  public chat: {
    completions: {
      create: (
        request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming
      ) => Promise<OpenAI.Chat.Completions.ChatCompletion>;
    };
  };

  constructor(config: LLMHelperConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.apiKey = config.apiKey;

    // Reuse Interface 4's ChatCompletionHandler
    // Defaults are applied in ChatCompletionHandler constructor
    this.handler = new ChatCompletionHandler({
      enabledTools: config.enabledTools,
      hiddenParams: config.hiddenParams,
      maxToolIterations: config.maxToolIterations || 5,
      filterBookChapterNotes: config.filterBookChapterNotes,
      enableToolExecution: true,
      upstreamUrl: config.upstreamUrl,
      timeout: config.timeout,
    });

    // Implement OpenAI client interface
    this.chat = {
      completions: {
        create: async (request) => {
          // Cast to any to handle the request parameter type compatibility
          // The OpenAI SDK types are slightly different but structurally compatible
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return await this.handler.handleChatCompletion(request as any, this.apiKey) as OpenAI.Chat.Completions.ChatCompletion;
        }
      }
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