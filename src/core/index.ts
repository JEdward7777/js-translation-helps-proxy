/**
 * Translation Helps Client - Core TypeScript API
 * Main entry point for the core library providing direct programmatic access to upstream tools
 */

import {
  TranslationHelpsClientConfig,
  Tool,
  ToolArguments,
  ToolResult,
  TextContent,
  ToolNotFoundError,
  ToolDisabledError,
  InvalidArgumentsError
} from './types.js';
import { UpstreamClient } from './upstream-client.js';
import { FilterEngine } from './filter-engine.js';
import { ToolRegistry } from './tool-registry.js';
import { ResponseFormatter } from './response-formatter.js';
import { Validator, logger, ErrorHandler } from '../shared/index.js';

/**
 * Main client class for accessing Translation Helps tools
 * Provides type-safe methods for all available tools with configurable filtering
 */
export class TranslationHelpsClient {
  private upstreamClient: UpstreamClient;
  private filterEngine: FilterEngine;
  private toolRegistry: ToolRegistry;
  private config: TranslationHelpsClientConfig;

  /**
   * Create a new Translation Helps client
   * @param config Client configuration with filtering options
   */
  constructor(config: TranslationHelpsClientConfig = {}) {
    // Validate configuration
    this.config = Validator.validateClientConfig(config);

    // Initialize components
    this.upstreamClient = new UpstreamClient({
      upstreamUrl: config.upstreamUrl || 'https://translation-helps-mcp.pages.dev/api/mcp',
      timeout: config.timeout,
      headers: config.headers
    });

    this.filterEngine = new FilterEngine({
      enabledTools: config.enabledTools,
      hiddenParams: config.hiddenParams,
      filterBookChapterNotes: config.filterBookChapterNotes
    });

    this.toolRegistry = new ToolRegistry(this.upstreamClient);

    logger.info('TranslationHelpsClient initialized', {
      upstreamUrl: this.config.upstreamUrl,
      enabledTools: this.config.enabledTools?.length || 'all',
      hiddenParams: this.config.hiddenParams?.length || 'none',
      filterBookChapterNotes: this.config.filterBookChapterNotes
    });
  }

  /**
   * List available tools (filtered according to client configuration)
   * @returns Array of available tools
   */
  async listTools(): Promise<Tool[]> {
    return ErrorHandler.wrap(async () => {
      const allTools = await this.toolRegistry.getAllTools();
      const filteredTools = this.filterEngine.filterTools(allTools);
      logger.debug(`Listed ${filteredTools.length} filtered tools`);
      return filteredTools;
    }, 'listing tools');
  }

  /**
   * Call a tool by name with arguments
   * @param name Tool name
   * @param args Tool arguments
   * @returns Tool execution result
   */
  async callTool(name: string, args: ToolArguments): Promise<ToolResult> {
    return ErrorHandler.wrap(async () => {
      // Check if tool is enabled
      if (!this.filterEngine.isToolEnabled(name)) {
        throw new ToolDisabledError(name);
      }

      // Validate tool exists
      const toolExists = await this.toolRegistry.hasTool(name);
      if (!toolExists) {
        throw new ToolNotFoundError(name);
      }

      // Validate arguments
      const isValid = await this.toolRegistry.validateToolArgs(name, args);
      if (!isValid) {
        throw new InvalidArgumentsError(`Invalid arguments for tool '${name}'`);
      }

      logger.debug(`Calling tool: ${name}`, args);

      // Call upstream (returns raw response now)
      const rawResponse = await this.upstreamClient.callTool(name, args);

      // Apply response filtering BEFORE formatting (works on structured data)
      const filteredResponse = this.filterEngine.filterBookChapterNotes(rawResponse);

      // Format response AFTER filtering (converts filtered structured data to text)
      const formattedResult = ResponseFormatter.formatResponse(filteredResponse);

      logger.debug(`Tool ${name} completed successfully`);
      return formattedResult;
    }, `calling tool '${name}'`);
  }

  // ============================================================================
  // Type-safe tool methods (matching Python implementation)
  // ============================================================================

  /**
   * Fetch Bible scripture text for a specific reference
   * @param args Tool arguments
   * @returns Scripture text
   */
  async fetchScripture(args: { reference: string; language?: string; organization?: string }): Promise<TextContent[]> {
    return this.callTool('fetch_scripture', args);
  }

  /**
   * Fetch translation notes for a specific Bible reference
   * @param args Tool arguments
   * @returns Translation notes
   */
  async fetchTranslationNotes(args: { reference: string; language?: string; organization?: string }): Promise<TextContent[]> {
    return this.callTool('fetch_translation_notes', args);
  }

  /**
   * Get the complete system prompt and constraints
   * @param args Tool arguments
   * @returns System prompt
   */
  async getSystemPrompt(args: { includeImplementationDetails?: boolean } = {}): Promise<TextContent[]> {
    return this.callTool('get_system_prompt', args);
  }

  /**
   * Fetch translation questions for a specific Bible reference
   * @param args Tool arguments
   * @returns Translation questions
   */
  async fetchTranslationQuestions(args: { reference: string; language?: string; organization?: string }): Promise<TextContent[]> {
    return this.callTool('fetch_translation_questions', args);
  }

  /**
   * Get translation words linked to a specific Bible reference
   * @param args Tool arguments
   * @returns Translation words
   */
  async getTranslationWord(args: { reference: string; wordId?: string; language?: string; organization?: string }): Promise<TextContent[]> {
    return this.callTool('get_translation_word', args);
  }

  /**
   * Browse and search translation words by category or term
   * @param args Tool arguments
   * @returns Translation words list
   */
  async browseTranslationWords(args: { language?: string; organization?: string; category?: string; search?: string; limit?: number } = {}): Promise<TextContent[]> {
    return this.callTool('browse_translation_words', args);
  }

  /**
   * Get contextual information for a Bible reference
   * @param args Tool arguments
   * @returns Context information
   */
  async getContext(args: { reference: string; language?: string; organization?: string }): Promise<TextContent[]> {
    return this.callTool('get_context', args);
  }

  /**
   * Extract and parse Bible references from text
   * @param args Tool arguments
   * @returns Extracted references
   */
  async extractReferences(args: { text: string; includeContext?: boolean }): Promise<TextContent[]> {
    return this.callTool('extract_references', args);
  }

  // ============================================================================
  // Configuration and utility methods
  // ============================================================================

  /**
   * Update client configuration
   * @param config Partial configuration to update
   */
  updateConfig(config: Partial<TranslationHelpsClientConfig>): void {
    this.config = { ...this.config, ...config };
    this.filterEngine.updateConfig(config);
    logger.info('Client configuration updated', config);
  }

  /**
   * Get current client configuration
   * @returns Current configuration
   */
  getConfig(): TranslationHelpsClientConfig {
    return { ...this.config };
  }

  /**
   * Test connection to upstream server
   * @returns True if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listTools();
      return true;
    } catch (error) {
      logger.error('Connection test failed', error);
      return false;
    }
  }

  /**
   * Clear tool registry cache
   */
  clearCache(): void {
    this.toolRegistry.clearCache();
    logger.debug('Tool registry cache cleared');
  }

  /**
   * Get cache status
   * @returns Cache status information
   */
  getCacheStatus() {
    return this.toolRegistry.getCacheStatus();
  }
}

// ============================================================================
// Exports
// ============================================================================

export type { TranslationHelpsClientConfig, Tool, ToolArguments, ToolResult, TextContent } from './types.js';

// Re-export commonly used shared utilities
export { logger, Validator, ErrorHandler } from '../shared/index.js';
export {
  ToolNotFoundError,
  ToolDisabledError,
  InvalidArgumentsError,
  UpstreamConnectionError,
  UpstreamResponseError
} from '../shared/index.js';