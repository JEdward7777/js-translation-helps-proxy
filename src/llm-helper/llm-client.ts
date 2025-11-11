/**
 * LLM Client - Wrapper for OpenAI and Anthropic APIs
 * Handles API calls, tool call parsing, and response formatting
 */

import {
  LLMProvider,
  LLMProviderConfig,
  ChatMessage,
  ChatResponse,
  OpenAIRequest,
  OpenAIResponse,
  OpenAIChatMessage,
  OpenAITool,
  OpenAIToolCall,
  AnthropicRequest,
  AnthropicResponse,
  AnthropicChatMessage,
  AnthropicTool,
  AnthropicContent,
  ToolCall,
  LLMProviderError,
  InvalidConfigError,
} from './types.js';
import { logger } from '../shared/index.js';

/**
 * LLM Client for making API calls to OpenAI or Anthropic
 */
export class LLMClient {
  private config: Required<LLMProviderConfig>;

  constructor(config: LLMProviderConfig) {
    this.validateConfig(config);
    
    this.config = {
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      baseURL: config.baseURL || this.getDefaultBaseURL(config.provider),
      timeout: config.timeout || 60000,
    };

    logger.info(`LLMClient initialized with provider: ${this.config.provider}`);
  }

  /**
   * Send a chat request to the LLM
   */
  async chat(
    messages: ChatMessage[],
    tools?: OpenAITool[] | AnthropicTool[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      stopSequences?: string[];
    }
  ): Promise<ChatResponse> {
    try {
      logger.debug(`Sending chat request to ${this.config.provider}`, {
        messageCount: messages.length,
        hasTools: !!tools,
      });

      if (this.config.provider === 'openai') {
        return await this.chatOpenAI(messages, tools as OpenAITool[], options);
      } else {
        return await this.chatAnthropic(messages, tools as AnthropicTool[], options);
      }
    } catch (error) {
      logger.error(`Error in chat request to ${this.config.provider}`, error);
      throw error;
    }
  }

  /**
   * Chat with OpenAI API
   */
  private async chatOpenAI(
    messages: ChatMessage[],
    tools?: OpenAITool[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      stopSequences?: string[];
    }
  ): Promise<ChatResponse> {
    const openaiMessages = this.convertToOpenAIMessages(messages);

    const request: OpenAIRequest = {
      model: this.config.model,
      messages: openaiMessages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      stop: options?.stopSequences,
    };

    if (tools && tools.length > 0) {
      request.tools = tools;
      request.tool_choice = 'auto';
    }

    const response = await this.fetchOpenAI('/v1/chat/completions', request);
    return this.parseOpenAIResponse(response);
  }

  /**
   * Chat with Anthropic API
   */
  private async chatAnthropic(
    messages: ChatMessage[],
    tools?: AnthropicTool[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      stopSequences?: string[];
    }
  ): Promise<ChatResponse> {
    const { system, messages: anthropicMessages } = this.convertToAnthropicMessages(messages);

    const request: AnthropicRequest = {
      model: this.config.model,
      messages: anthropicMessages,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature,
      top_p: options?.topP,
      stop_sequences: options?.stopSequences,
    };

    if (system) {
      request.system = system;
    }

    if (tools && tools.length > 0) {
      request.tools = tools;
    }

    const response = await this.fetchAnthropic('/v1/messages', request);
    return this.parseAnthropicResponse(response);
  }

  /**
   * Fetch from OpenAI API
   */
  private async fetchOpenAI(endpoint: string, body: any): Promise<OpenAIResponse> {
    const url = `${this.config.baseURL}${endpoint}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new LLMProviderError(
          errorData.error?.message || `OpenAI API error: ${response.statusText}`,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof LLMProviderError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new LLMProviderError(`Request timed out after ${this.config.timeout}ms`);
      }

      throw new LLMProviderError(
        `OpenAI API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Fetch from Anthropic API
   */
  private async fetchAnthropic(endpoint: string, body: any): Promise<AnthropicResponse> {
    const url = `${this.config.baseURL}${endpoint}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new LLMProviderError(
          errorData.error?.message || `Anthropic API error: ${response.statusText}`,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof LLMProviderError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new LLMProviderError(`Request timed out after ${this.config.timeout}ms`);
      }

      throw new LLMProviderError(
        `Anthropic API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert generic messages to OpenAI format
   */
  private convertToOpenAIMessages(messages: ChatMessage[]): OpenAIChatMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Convert generic messages to Anthropic format
   */
  private convertToAnthropicMessages(messages: ChatMessage[]): {
    system?: string;
    messages: AnthropicChatMessage[];
  } {
    let system: string | undefined;
    const anthropicMessages: AnthropicChatMessage[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Anthropic uses a separate system parameter
        system = msg.content;
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        anthropicMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    return { system, messages: anthropicMessages };
  }

  /**
   * Parse OpenAI response
   */
  private parseOpenAIResponse(response: OpenAIResponse): ChatResponse {
    const choice = response.choices[0];
    if (!choice) {
      throw new LLMProviderError('No choices in OpenAI response');
    }

    const message = choice.message;
    const toolCalls = message.tool_calls
      ? this.parseOpenAIToolCalls(message.tool_calls)
      : undefined;

    return {
      id: response.id,
      model: response.model,
      message: {
        role: 'assistant',
        content: message.content || '',
      },
      finishReason: choice.finish_reason,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
      toolCalls,
      rawResponse: response,
    };
  }

  /**
   * Parse Anthropic response
   */
  private parseAnthropicResponse(response: AnthropicResponse): ChatResponse {
    let content = '';
    let toolCalls: ToolCall[] | undefined;

    for (const item of response.content) {
      if (item.type === 'text') {
        content += item.text;
      } else if (item.type === 'tool_use') {
        if (!toolCalls) {
          toolCalls = [];
        }
        toolCalls.push({
          id: item.id,
          name: item.name,
          arguments: item.input,
        });
      }
    }

    return {
      id: response.id,
      model: response.model,
      message: {
        role: 'assistant',
        content,
      },
      finishReason: response.stop_reason === 'end_turn' ? 'stop' :
                    response.stop_reason === 'tool_use' ? 'tool_calls' :
                    response.stop_reason === 'max_tokens' ? 'max_tokens' :
                    response.stop_reason === 'stop_sequence' ? 'stop' :
                    null,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      toolCalls,
      rawResponse: response,
    };
  }

  /**
   * Parse OpenAI tool calls
   */
  private parseOpenAIToolCalls(toolCalls: OpenAIToolCall[]): ToolCall[] {
    return toolCalls.map(tc => {
      let args: Record<string, any> = {};
      
      try {
        if (tc.function.arguments) {
          args = JSON.parse(tc.function.arguments);
        }
      } catch (error) {
        logger.error(`Failed to parse tool call arguments for ${tc.function.name}`, error);
        throw new LLMProviderError(
          `Invalid tool call arguments: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      return {
        id: tc.id,
        name: tc.function.name,
        arguments: args,
      };
    });
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: LLMProviderConfig): void {
    if (!config.provider) {
      throw new InvalidConfigError('Provider is required');
    }

    if (!['openai', 'anthropic'].includes(config.provider)) {
      throw new InvalidConfigError(`Invalid provider: ${config.provider}`);
    }

    if (!config.apiKey) {
      throw new InvalidConfigError('API key is required');
    }

    if (!config.model) {
      throw new InvalidConfigError('Model is required');
    }
  }

  /**
   * Get default base URL for provider
   */
  private getDefaultBaseURL(provider: LLMProvider): string {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com';
      case 'anthropic':
        return 'https://api.anthropic.com';
      default:
        throw new InvalidConfigError(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Get provider
   */
  getProvider(): LLMProvider {
    return this.config.provider;
  }

  /**
   * Get model
   */
  getModel(): string {
    return this.config.model;
  }
}