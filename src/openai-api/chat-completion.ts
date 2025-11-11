/**
 * Chat completion handler with tool execution
 * Based on MCP-Bridge sampler logic for iterative tool calling
 */

import { TranslationHelpsClient } from '../core/index.js';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionMessage,
  OpenAIBridgeConfig,
  OpenAIAPIError,
  ToolCall,
} from './types.js';
import {
  mcpToolsToOpenAI,
  openaiToolCallToMCP,
  mcpResultToOpenAI,
  applyBakedInFilters,
  extractToolCallsFromMessages,
} from './tool-mapper.js';
import { logger } from '../shared/index.js';

/**
 * Chat completion handler with automatic tool execution
 */
export class ChatCompletionHandler {
  private client: TranslationHelpsClient;
  private config: Required<OpenAIBridgeConfig>;

  constructor(config: OpenAIBridgeConfig = {}) {
    this.config = {
      language: config.language || 'en',
      filterBookChapterNotes: config.filterBookChapterNotes ?? true,
      organization: config.organization || 'unfoldingWord',
      maxToolIterations: config.maxToolIterations || 5,
      enableToolExecution: config.enableToolExecution ?? true,
      upstreamUrl: config.upstreamUrl || 'https://translation-helps-mcp.pages.dev/api/mcp',
      timeout: config.timeout || 30000,
    };

    // Initialize client with baked-in filters
    this.client = new TranslationHelpsClient({
      upstreamUrl: this.config.upstreamUrl,
      timeout: this.config.timeout,
      filterBookChapterNotes: this.config.filterBookChapterNotes,
    });

    logger.info('ChatCompletionHandler initialized', {
      language: this.config.language,
      organization: this.config.organization,
      filterBookChapterNotes: this.config.filterBookChapterNotes,
    });
  }

  /**
   * Handle chat completion request
   */
  async handleChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    try {
      logger.debug('Handling chat completion request', {
        model: request.model,
        messageCount: request.messages.length,
        hasTools: !!request.tools,
      });

      // Validate request
      this.validateRequest(request);

      // If streaming is requested, throw error (not supported yet)
      if (request.stream) {
        throw new OpenAIAPIError('Streaming is not yet supported', 400, 'invalid_request_error');
      }

      // Get available tools
      const mcpTools = await this.client.listTools();
      const openaiTools = mcpToolsToOpenAI(mcpTools);

      // Execute tool calls if present in messages
      if (this.config.enableToolExecution) {
        const toolCalls = extractToolCallsFromMessages(request.messages);
        
        if (toolCalls.length > 0) {
          logger.info(`Found ${toolCalls.length} tool calls to execute`);
          const updatedMessages = await this.executeToolCalls(
            request.messages,
            toolCalls
          );
          request.messages = updatedMessages;
        }
      }

      // Create response
      const response = this.createResponse(request, openaiTools);

      logger.info('Chat completion completed successfully');
      return response;
    } catch (error) {
      logger.error('Error handling chat completion', error);
      
      if (error instanceof OpenAIAPIError) {
        throw error;
      }
      
      throw new OpenAIAPIError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        500,
        'internal_error'
      );
    }
  }

  /**
   * Execute tool calls iteratively
   */
  private async executeToolCalls(
    messages: ChatCompletionMessage[],
    toolCalls: ToolCall[]
  ): Promise<ChatCompletionMessage[]> {
    const updatedMessages = [...messages];
    let iteration = 0;

    while (toolCalls.length > 0 && iteration < this.config.maxToolIterations) {
      iteration++;
      logger.debug(`Tool execution iteration ${iteration}/${this.config.maxToolIterations}`);

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall) => {
          try {
            const mcpCall = openaiToolCallToMCP(toolCall);
            
            // Apply baked-in filters
            const filteredArgs = applyBakedInFilters(
              mcpCall.name,
              mcpCall.arguments,
              {
                language: this.config.language,
                organization: this.config.organization,
              }
            );

            logger.debug(`Executing tool: ${mcpCall.name}`, filteredArgs);

            // Execute the tool
            const result = await this.client.callTool(mcpCall.name, filteredArgs);

            // Convert result to OpenAI format
            return mcpResultToOpenAI(toolCall.id, mcpCall.name, result);
          } catch (error) {
            logger.error(`Error executing tool ${toolCall.function.name}`, error);
            
            // Return error as tool result
            return {
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        })
      );

      // Add tool results to messages
      updatedMessages.push(...toolResults);

      // Check if there are more tool calls to execute
      // In a real implementation, this would involve calling an LLM
      // For now, we just execute the tools and return
      break;
    }

    if (iteration >= this.config.maxToolIterations) {
      logger.warn(`Reached maximum tool iterations (${this.config.maxToolIterations})`);
    }

    return updatedMessages;
  }

  /**
   * Create chat completion response
   */
  private createResponse(
    request: ChatCompletionRequest,
    tools: any[]
  ): ChatCompletionResponse {
    // Get the last message or create a default response
    const lastMessage = request.messages[request.messages.length - 1];
    
    let responseMessage: ChatCompletionMessage;
    
    if (lastMessage.role === 'tool') {
      // If last message is a tool result, create assistant response
      responseMessage = {
        role: 'assistant',
        content: 'Tool execution completed. The results are available in the conversation history.',
      };
    } else {
      // Otherwise, provide tools information
      responseMessage = {
        role: 'assistant',
        content: `I have access to ${tools.length} translation helps tools. You can ask me to fetch scripture, translation notes, translation questions, translation words, and more.`,
      };
    }

    const response: ChatCompletionResponse = {
      id: `chatcmpl-${this.generateId()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          message: responseMessage,
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: this.estimateTokens(request.messages),
        completion_tokens: this.estimateTokens([responseMessage]),
        total_tokens: 0,
      },
    };

    response.usage!.total_tokens = response.usage!.prompt_tokens + response.usage!.completion_tokens;

    return response;
  }

  /**
   * Validate chat completion request
   */
  private validateRequest(request: ChatCompletionRequest): void {
    if (!request.model) {
      throw new OpenAIAPIError('Missing required field: model', 400, 'invalid_request_error', 'model');
    }

    if (!request.messages || !Array.isArray(request.messages)) {
      throw new OpenAIAPIError('Missing required field: messages', 400, 'invalid_request_error', 'messages');
    }

    if (request.messages.length === 0) {
      throw new OpenAIAPIError('Messages array cannot be empty', 400, 'invalid_request_error', 'messages');
    }

    // Validate message structure
    for (const message of request.messages) {
      if (!message.role) {
        throw new OpenAIAPIError('Message missing required field: role', 400, 'invalid_request_error', 'messages');
      }

      if (!['system', 'user', 'assistant', 'tool'].includes(message.role)) {
        throw new OpenAIAPIError(
          `Invalid message role: ${message.role}`,
          400,
          'invalid_request_error',
          'messages'
        );
      }
    }
  }

  /**
   * Generate unique ID for responses
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(messages: ChatCompletionMessage[]): number {
    let total = 0;
    for (const message of messages) {
      if (message.content) {
        // Rough estimate: ~4 characters per token
        total += Math.ceil(message.content.length / 4);
      }
      // Add overhead for message structure
      total += 4;
    }
    return total;
  }

  /**
   * Get client instance
   */
  getClient(): TranslationHelpsClient {
    return this.client;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OpenAIBridgeConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Configuration updated', config);
  }
}