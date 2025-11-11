/**
 * LLM Helper - Main class for LLM integration with automatic tool execution
 * Provides a TypeScript function interface for making LLM calls with MCP tools
 */

import { TranslationHelpsClient } from '../core/index.js';
import { Tool } from '../core/types.js';
import { LLMClient } from './llm-client.js';
import { ToolExecutor } from './tool-executor.js';
import {
  LLMHelperConfig,
  ChatMessage,
  ChatResponse,
  ToolCall,
  ToolResult,
  ToolExecutionOptions,
  OpenAITool,
  AnthropicTool,
  InvalidConfigError,
  MaxIterationsError,
} from './types.js';
import { logger } from '../shared/index.js';

/**
 * LLM Helper - Main class for LLM integration
 */
export class LLMHelper {
  private llmClient: LLMClient;
  private toolExecutor: ToolExecutor;
  private translationHelpsClient: TranslationHelpsClient;
  private config: LLMHelperConfig & {
    maxToolIterations: number;
    enableToolExecution: boolean;
    language: string;
    organization: string;
  };

  constructor(config: LLMHelperConfig) {
    this.validateConfig(config);

    // Set defaults
    this.config = {
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      baseURL: config.baseURL,
      translationHelpsConfig: config.translationHelpsConfig || {},
      maxToolIterations: config.maxToolIterations || 5,
      enableToolExecution: config.enableToolExecution ?? true,
      language: config.language || 'en',
      organization: config.organization || 'unfoldingWord',
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      timeout: config.timeout,
    };

    // Initialize Translation Helps client
    const thConfig = this.config.translationHelpsConfig || {};
    this.translationHelpsClient = new TranslationHelpsClient({
      upstreamUrl: thConfig.upstreamUrl ||
                   'https://translation-helps-mcp.pages.dev/api/mcp',
      timeout: thConfig.timeout || 30000,
      filterBookChapterNotes: thConfig.filterBookChapterNotes ?? true,
      enabledTools: thConfig.enabledTools,
      hiddenParams: thConfig.hiddenParams,
    });

    // Initialize LLM client
    this.llmClient = new LLMClient({
      provider: this.config.provider,
      apiKey: this.config.apiKey,
      model: this.config.model,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
    });

    // Initialize tool executor
    this.toolExecutor = new ToolExecutor(this.translationHelpsClient, {
      language: this.config.language,
      organization: this.config.organization,
    });

    logger.info('LLMHelper initialized', {
      provider: this.config.provider,
      model: this.config.model,
      language: this.config.language,
      organization: this.config.organization,
      maxToolIterations: this.config.maxToolIterations,
    });
  }

  /**
   * Main method: chat with automatic tool execution
   */
  async chat(
    messages: ChatMessage[],
    options?: ToolExecutionOptions
  ): Promise<ChatResponse> {
    try {
      logger.info('Starting chat with automatic tool execution', {
        messageCount: messages.length,
        enableToolExecution: this.config.enableToolExecution,
      });

      // Get available tools
      const tools = await this.getTools();

      // If tool execution is disabled, just make a single LLM call
      if (!this.config.enableToolExecution) {
        return await this.llmClient.chat(messages, tools, {
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        });
      }

      // Execute iterative tool calling loop
      return await this.chatWithToolExecution(messages, tools, options);
    } catch (error) {
      logger.error('Error in chat', error);
      throw error;
    }
  }

  /**
   * Chat with iterative tool execution
   */
  private async chatWithToolExecution(
    initialMessages: ChatMessage[],
    tools: OpenAITool[] | AnthropicTool[],
    options?: ToolExecutionOptions
  ): Promise<ChatResponse> {
    const maxIterations = options?.maxIterations || this.config.maxToolIterations;
    let messages = [...initialMessages];
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      
      logger.debug(`Tool execution iteration ${iteration}/${maxIterations}`);
      
      // Call LLM
      const response = await this.llmClient.chat(messages, tools, {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      // Check if there are tool calls
      if (!response.toolCalls || response.toolCalls.length === 0) {
        logger.info('No tool calls in response, returning result');
        return response;
      }

      logger.info(`LLM requested ${response.toolCalls.length} tool calls`);

      // Notify about tool calls
      if (options?.onToolCall) {
        response.toolCalls.forEach(tc => options.onToolCall!(tc));
      }

      // Execute tools
      const toolResults = await this.toolExecutor.executeTools(response.toolCalls);

      // Notify about tool results
      if (options?.onToolResult) {
        toolResults.forEach(tr => options.onToolResult!(tr));
      }

      // Notify about iteration
      if (options?.onIteration) {
        options.onIteration(iteration, maxIterations);
      }

      // Add assistant message with tool calls and tool results to messages
      messages = this.addToolCallsAndResults(
        messages,
        response.message,
        response.toolCalls,
        toolResults
      );

      // Check if any tool execution failed
      const hasErrors = toolResults.some(tr => tr.isError);
      if (hasErrors) {
        logger.warn('Some tool executions failed, continuing with errors in context');
      }
    }

    // Max iterations reached
    logger.warn(`Maximum tool iterations reached (${maxIterations})`);
    throw new MaxIterationsError(maxIterations);
  }

  /**
   * Add tool calls and results to message history
   */
  private addToolCallsAndResults(
    messages: ChatMessage[],
    assistantMessage: ChatMessage,
    toolCalls: ToolCall[],
    toolResults: ToolResult[]
  ): ChatMessage[] {
    const updatedMessages = [...messages];

    // Add assistant message (may contain text before tool calls)
    if (assistantMessage.content) {
      updatedMessages.push(assistantMessage);
    }

    // Add tool results as user messages
    // This is a simplified approach - in production, you'd want to format these
    // according to the specific LLM provider's requirements
    for (const result of toolResults) {
      updatedMessages.push({
        role: 'user',
        content: `Tool result for ${result.name}:\n${result.content}`,
      });
    }

    return updatedMessages;
  }

  /**
   * Get available tools in the appropriate format
   */
  private async getTools(): Promise<OpenAITool[] | AnthropicTool[]> {
    if (this.config.provider === 'openai') {
      return await this.toolExecutor.getOpenAITools();
    } else {
      return await this.toolExecutor.getAnthropicTools();
    }
  }

  /**
   * Get available tools (raw MCP format)
   */
  async getAvailableTools(): Promise<Tool[]> {
    return await this.translationHelpsClient.listTools();
  }

  /**
   * Execute a single tool manually
   */
  async executeTool(name: string, args: Record<string, any>): Promise<string> {
    logger.info(`Manually executing tool: ${name}`, args);

    const toolCall: ToolCall = {
      id: `manual-${Date.now()}`,
      name,
      arguments: args,
    };

    const result = await this.toolExecutor.executeTool(toolCall);
    
    if (result.isError) {
      throw new Error(result.content);
    }

    return result.content;
  }

  /**
   * Get LLM provider
   */
  getProvider(): string {
    return this.config.provider;
  }

  /**
   * Get LLM model
   */
  getModel(): string {
    return this.config.model;
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<typeof this.config> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LLMHelperConfig>): void {
    if (config.language) {
      this.config.language = config.language;
      this.toolExecutor.updateConfig({ language: config.language });
    }

    if (config.organization) {
      this.config.organization = config.organization;
      this.toolExecutor.updateConfig({ organization: config.organization });
    }

    if (config.maxToolIterations !== undefined) {
      this.config.maxToolIterations = config.maxToolIterations;
    }

    if (config.enableToolExecution !== undefined) {
      this.config.enableToolExecution = config.enableToolExecution;
    }

    if (config.temperature !== undefined) {
      this.config.temperature = config.temperature;
    }

    if (config.maxTokens !== undefined) {
      this.config.maxTokens = config.maxTokens;
    }

    logger.info('LLMHelper configuration updated', config);
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: LLMHelperConfig): void {
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
}

// Re-export types for convenience
export * from './types.js';
export { LLMClient } from './llm-client.js';
export { ToolExecutor } from './tool-executor.js';