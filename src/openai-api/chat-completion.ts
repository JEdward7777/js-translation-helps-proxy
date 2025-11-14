/**
 * Chat completion handler with OpenAI proxy and tool execution
 * Proxies requests to OpenAI's API with automatic Translation Helps tool injection
 */

import OpenAI from 'openai';
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
} from './tool-mapper.js';
import { logger } from '../shared/index.js';

/**
 * Chat completion handler with OpenAI proxy and automatic tool execution
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

    // Initialize translation helps client with baked-in filters
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
   * Handle chat completion request - proxies to OpenAI with tool injection
   */
  async handleChatCompletion(
    request: ChatCompletionRequest,
    apiKey: string
  ): Promise<ChatCompletionResponse> {
    try {
      logger.debug('Handling chat completion request', {
        model: request.model,
        messageCount: request.messages.length,
        hasTools: !!request.tools,
        n: request.n,
      });

      // Validate request
      this.validateRequest(request);

      // If streaming is requested, throw error (not supported yet)
      if (request.stream) {
        throw new OpenAIAPIError('Streaming is not yet supported', 400, 'invalid_request_error');
      }

      // Initialize OpenAI client with user's API key
      const openai = new OpenAI({ apiKey });

      // Get translation helps tools
      const mcpTools = await this.client.listTools();
      const openaiTools = mcpToolsToOpenAI(mcpTools);

      logger.info(`Injecting ${openaiTools.length} translation helps tools`);

      // Execute iterative tool calling loop
      const response = await this.executeToolCallingLoop(
        openai,
        request,
        openaiTools
      );

      logger.info('Chat completion completed successfully');
      return response;
    } catch (error) {
      logger.error('Error handling chat completion', error);
      
      if (error instanceof OpenAIAPIError) {
        throw error;
      }
      
      // Handle OpenAI SDK errors
      if (error && typeof error === 'object' && 'status' in error) {
        const openaiError = error as any;
        throw new OpenAIAPIError(
          openaiError.message || 'OpenAI API error',
          openaiError.status || 500,
          openaiError.type || 'api_error'
        );
      }
      
      throw new OpenAIAPIError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        500,
        'internal_error'
      );
    }
  }

  /**
   * Execute iterative tool calling loop with OpenAI
   * Supports n > 1 and structured outputs
   */
  private async executeToolCallingLoop(
    openai: OpenAI,
    request: ChatCompletionRequest,
    tools: any[]
  ): Promise<ChatCompletionResponse> {
    let currentMessages = [...request.messages];
    let iteration = 0;
    const n = request.n || 1;

    while (iteration < this.config.maxToolIterations) {
      iteration++;
      logger.debug(`Tool calling iteration ${iteration}/${this.config.maxToolIterations}`);

      // Build request parameters, preserving all OpenAI options including structured outputs
      const requestParams: any = {
        model: request.model,
        messages: currentMessages as any,
        tools: tools,
        n: n, // Preserve n parameter
      };

      // Add optional parameters if present
      if (request.tool_choice !== undefined) requestParams.tool_choice = request.tool_choice;
      if (request.temperature !== undefined) requestParams.temperature = request.temperature;
      if (request.top_p !== undefined) requestParams.top_p = request.top_p;
      if (request.max_tokens !== undefined) requestParams.max_tokens = request.max_tokens;
      if (request.presence_penalty !== undefined) requestParams.presence_penalty = request.presence_penalty;
      if (request.frequency_penalty !== undefined) requestParams.frequency_penalty = request.frequency_penalty;
      if (request.stop !== undefined) requestParams.stop = request.stop;
      if (request.user !== undefined) requestParams.user = request.user;
      if (request.logit_bias !== undefined) requestParams.logit_bias = request.logit_bias;
      
      // Support for structured outputs (response_format)
      if ((request as any).response_format !== undefined) {
        requestParams.response_format = (request as any).response_format;
      }

      // Call OpenAI with tools
      const response = await openai.chat.completions.create(requestParams);

      // Check if any of the n responses has tool calls
      let hasToolCalls = false;
      let firstToolCallChoice = null;

      for (const choice of response.choices) {
        if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
          hasToolCalls = true;
          firstToolCallChoice = choice;
          break;
        }
      }

      // If no tool calls in any response, return the response
      if (!hasToolCalls) {
        logger.info('No tool calls requested in any response, returning');
        return response as ChatCompletionResponse;
      }

      // Tool calls requested - execute them if enabled
      if (!this.config.enableToolExecution) {
        logger.info('Tool execution disabled, returning response with tool calls');
        return response as ChatCompletionResponse;
      }

      const message = firstToolCallChoice!.message;
      logger.info(`Executing ${message.tool_calls!.length} tool calls from first choice`);

      // Add assistant message with tool calls to conversation
      currentMessages.push({
        role: 'assistant',
        content: message.content,
        tool_calls: message.tool_calls as ToolCall[],
      });

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        message.tool_calls!.map(async (toolCall: any) => {
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
      currentMessages.push(...toolResults);
    }

    // Max iterations reached - return final response
    logger.warn(`Reached maximum tool iterations (${this.config.maxToolIterations})`);
    
    // Make one final call to get a response (without tools to avoid infinite loop)
    const finalRequestParams: any = {
      model: request.model,
      messages: currentMessages as any,
      n: n, // Preserve n parameter
    };

    // Add optional parameters for final call
    if (request.temperature !== undefined) finalRequestParams.temperature = request.temperature;
    if (request.top_p !== undefined) finalRequestParams.top_p = request.top_p;
    if (request.max_tokens !== undefined) finalRequestParams.max_tokens = request.max_tokens;
    if ((request as any).response_format !== undefined) {
      finalRequestParams.response_format = (request as any).response_format;
    }

    const finalResponse = await openai.chat.completions.create(finalRequestParams);

    return finalResponse as ChatCompletionResponse;
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