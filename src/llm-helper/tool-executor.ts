/**
 * Tool Executor - Automatic tool execution for LLM responses
 * Detects tool calls, executes them, and formats results
 */

import { TranslationHelpsClient } from '../core/index.js';
import { Tool } from '../core/types.js';
import {
  ToolCall,
  ToolResult,
  ToolExecutionOptions,
  ToolExecutionContext,
  ChatMessage,
  OpenAITool,
  AnthropicTool,
  OpenAIChatMessage,
  AnthropicChatMessage,
  AnthropicContent,
  LLMProvider,
  ToolExecutionError,
  MaxIterationsError,
} from './types.js';
import { mcpToolsToOpenAI, applyBakedInFilters } from '../openai-api/tool-mapper.js';
import { logger } from '../shared/index.js';

/**
 * Tool Executor for automatic tool execution
 */
export class ToolExecutor {
  private client: TranslationHelpsClient;
  private language: string;
  private organization: string;

  constructor(
    client: TranslationHelpsClient,
    config: {
      language?: string;
      organization?: string;
    } = {}
  ) {
    this.client = client;
    this.language = config.language || 'en';
    this.organization = config.organization || 'unfoldingWord';

    logger.info('ToolExecutor initialized', {
      language: this.language,
      organization: this.organization,
    });
  }

  /**
   * Get available tools in OpenAI format
   */
  async getOpenAITools(): Promise<OpenAITool[]> {
    const mcpTools = await this.client.listTools();
    return mcpToolsToOpenAI(mcpTools);
  }

  /**
   * Get available tools in Anthropic format
   */
  async getAnthropicTools(): Promise<AnthropicTool[]> {
    const mcpTools = await this.client.listTools();
    return this.convertToAnthropicTools(mcpTools);
  }

  /**
   * Execute a single tool call
   */
  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    try {
      logger.debug(`Executing tool: ${toolCall.name}`, toolCall.arguments);

      // Apply baked-in filters
      const filteredArgs = applyBakedInFilters(
        toolCall.name,
        toolCall.arguments,
        {
          language: this.language,
          organization: this.organization,
        }
      );

      // Execute the tool
      const result = await this.client.callTool(toolCall.name, filteredArgs);

      // Format result as string
      const content = result.map(item => item.text).join('\n\n');

      logger.debug(`Tool execution successful: ${toolCall.name}`);

      return {
        id: toolCall.id,
        name: toolCall.name,
        content,
        isError: false,
      };
    } catch (error) {
      logger.error(`Error executing tool ${toolCall.name}`, error);

      return {
        id: toolCall.id,
        name: toolCall.name,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true,
      };
    }
  }

  /**
   * Execute multiple tool calls in parallel
   */
  async executeTools(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    logger.info(`Executing ${toolCalls.length} tool calls`);
    return await Promise.all(toolCalls.map(tc => this.executeTool(tc)));
  }

  /**
   * Format tool results for OpenAI
   */
  formatToolResultsForOpenAI(toolResults: ToolResult[]): OpenAIChatMessage[] {
    return toolResults.map(result => ({
      role: 'tool' as const,
      tool_call_id: result.id,
      name: result.name,
      content: result.content,
    }));
  }

  /**
   * Format tool results for Anthropic
   */
  formatToolResultsForAnthropic(toolResults: ToolResult[]): AnthropicContent[] {
    return toolResults.map(result => ({
      type: 'tool_result' as const,
      tool_use_id: result.id,
      content: result.content,
    }));
  }

  /**
   * Add tool results to messages for OpenAI
   */
  addToolResultsToOpenAIMessages(
    messages: OpenAIChatMessage[],
    toolResults: ToolResult[]
  ): OpenAIChatMessage[] {
    return [
      ...messages,
      ...this.formatToolResultsForOpenAI(toolResults),
    ];
  }

  /**
   * Add tool results to messages for Anthropic
   */
  addToolResultsToAnthropicMessages(
    messages: AnthropicChatMessage[],
    toolResults: ToolResult[]
  ): AnthropicChatMessage[] {
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage || lastMessage.role !== 'assistant') {
      throw new ToolExecutionError('Cannot add tool results: last message must be from assistant');
    }

    // Add tool results to the last assistant message
    const existingContent: AnthropicContent[] = Array.isArray(lastMessage.content)
      ? lastMessage.content
      : [{ type: 'text' as const, text: lastMessage.content }];
    
    const updatedLastMessage: AnthropicChatMessage = {
      role: 'assistant',
      content: [
        ...existingContent,
        ...this.formatToolResultsForAnthropic(toolResults),
      ],
    };

    return [
      ...messages.slice(0, -1),
      updatedLastMessage,
    ];
  }

  /**
   * Convert MCP tools to Anthropic format
   */
  private convertToAnthropicTools(mcpTools: Tool[]): AnthropicTool[] {
    return mcpTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object' as const,
        properties: tool.inputSchema.properties || {},
        required: tool.inputSchema.required || [],
      },
    }));
  }

  /**
   * Check if there are any tool calls in the results
   */
  hasToolCalls(toolCalls?: ToolCall[]): boolean {
    return !!toolCalls && toolCalls.length > 0;
  }

  /**
   * Validate tool execution context
   */
  validateContext(context: ToolExecutionContext): void {
    if (context.iteration >= context.maxIterations) {
      throw new MaxIterationsError(context.maxIterations);
    }

    if (context.toolCalls.length === 0) {
      throw new ToolExecutionError('No tool calls to execute');
    }
  }

  /**
   * Create execution context
   */
  createContext(
    messages: ChatMessage[],
    maxIterations: number = 5
  ): ToolExecutionContext {
    return {
      iteration: 0,
      maxIterations,
      messages,
      toolCalls: [],
      toolResults: [],
    };
  }

  /**
   * Update execution context with new iteration
   */
  updateContext(
    context: ToolExecutionContext,
    toolCalls: ToolCall[],
    toolResults: ToolResult[]
  ): ToolExecutionContext {
    return {
      ...context,
      iteration: context.iteration + 1,
      toolCalls,
      toolResults: [...context.toolResults, ...toolResults],
    };
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
  updateConfig(config: { language?: string; organization?: string }): void {
    if (config.language) {
      this.language = config.language;
    }
    if (config.organization) {
      this.organization = config.organization;
    }
    logger.info('ToolExecutor configuration updated', config);
  }
}