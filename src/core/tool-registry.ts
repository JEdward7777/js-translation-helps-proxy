/**
 * Tool registry for managing tool schemas and metadata
 * Dynamically loads tools from upstream and provides lookup functionality
 */

import {
  Tool,
  ToolSchema,
  fetchScriptureSchema,
  fetchTranslationNotesSchema,
  getSystemPromptSchema,
  fetchTranslationQuestionsSchema,
  getTranslationWordSchema,
  browseTranslationWordsSchema,
  getContextSchema,
  extractReferencesSchema,
  fetchResourcesSchema,
  getWordsForReferenceSchema,
  searchResourcesSchema,
  getLanguagesSchema
} from './types.js';
import { UpstreamClient } from './upstream-client.js';
import { logger } from '../shared/index.js';

export class ToolRegistry {
  private upstreamClient: UpstreamClient;
  private cachedTools: Tool[] | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Static tool schemas for validation (exact schemas from Python)
  private static readonly TOOL_SCHEMAS: Record<string, ToolSchema> = {
    fetch_scripture: fetchScriptureSchema,
    fetch_translation_notes: fetchTranslationNotesSchema,
    get_system_prompt: getSystemPromptSchema,
    fetch_translation_questions: fetchTranslationQuestionsSchema,
    get_translation_word: getTranslationWordSchema,
    browse_translation_words: browseTranslationWordsSchema,
    get_context: getContextSchema,
    extract_references: extractReferencesSchema,
    fetch_resources: fetchResourcesSchema,
    get_words_for_reference: getWordsForReferenceSchema,
    search_resources: searchResourcesSchema,
    get_languages: getLanguagesSchema
  };

  constructor(upstreamClient: UpstreamClient) {
    this.upstreamClient = upstreamClient;
  }

  /**
   * Get all available tools from upstream (with caching)
   */
  async getAllTools(): Promise<Tool[]> {
    const now = Date.now();

    // Return cached tools if still valid
    if (this.cachedTools && (now - this.lastFetchTime) < this.CACHE_TTL) {
      return this.cachedTools;
    }

    try {
      logger.debug('Fetching tools from upstream for registry');
      const tools = await this.upstreamClient.listTools();
      this.cachedTools = tools;
      this.lastFetchTime = now;
      logger.info(`Loaded ${tools.length} tools into registry`);
      return tools;
    } catch (error) {
      logger.error('Failed to fetch tools for registry', error);
      // Return cached tools if available, otherwise throw the error
      if (this.cachedTools) {
        return this.cachedTools;
      }
      throw error;
    }
  }

  /**
   * Get a specific tool by name
   */
  async getTool(name: string): Promise<Tool | null> {
    const tools = await this.getAllTools();
    return tools.find(tool => tool.name === name) || null;
  }

  /**
   * Check if a tool exists
   */
  async hasTool(name: string): Promise<boolean> {
    const tool = await this.getTool(name);
    return tool !== null;
  }

  /**
   * Get tool names
   */
  async getToolNames(): Promise<string[]> {
    const tools = await this.getAllTools();
    return tools.map(tool => tool.name);
  }

  /**
   * Validate tool arguments against schema
   */
  async validateToolArgs(name: string, args: Record<string, any>): Promise<boolean> {
    const tool = await this.getTool(name);
    if (!tool) {
      return false;
    }

    // Basic validation - check required fields
    const required = tool.inputSchema.required || [];
    for (const field of required) {
      if (!(field in args)) {
        logger.debug(`Tool ${name} missing required field: ${field}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Get static tool schema (for validation purposes)
   */
  getStaticToolSchema(name: string): ToolSchema | null {
    return ToolRegistry.TOOL_SCHEMAS[name] || null;
  }

  /**
   * Get all static tool schemas
   */
  getAllStaticSchemas(): Record<string, ToolSchema> {
    return { ...ToolRegistry.TOOL_SCHEMAS };
  }

  /**
   * Clear tool cache (force refresh on next call)
   */
  clearCache(): void {
    this.cachedTools = null;
    this.lastFetchTime = 0;
    logger.debug('Tool registry cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { hasCache: boolean; age: number; toolCount: number } {
    const now = Date.now();
    return {
      hasCache: this.cachedTools !== null,
      age: this.cachedTools ? now - this.lastFetchTime : 0,
      toolCount: this.cachedTools?.length || 0
    };
  }
}