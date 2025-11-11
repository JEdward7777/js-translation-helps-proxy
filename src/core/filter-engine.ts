/**
 * Filter engine for tool and response filtering
 * Preserves exact filtering behavior from Python implementation
 */

import { FilterConfig, Tool } from './types.js';
import { logger } from '../shared/index.js';

export class FilterEngine {
  constructor(private config: FilterConfig) {}

  /**
   * Filter tools based on enabled_tools and hidden_params
   */
  filterTools(tools: Tool[]): Tool[] {
    let filtered = tools;

    // Filter by enabled tools
    if (this.config.enabledTools && this.config.enabledTools.length > 0) {
      filtered = filtered.filter(tool => this.isToolEnabled(tool.name));
      logger.debug(`Filtered to ${filtered.length} enabled tools: ${filtered.map(t => t.name).join(', ')}`);
    }

    // Apply parameter hiding to each tool
    filtered = filtered.map(tool => this.filterParameters(tool));

    return filtered;
  }

  /**
   * Check if a tool is enabled
   */
  isToolEnabled(toolName: string): boolean {
    // If no enabled tools specified, all tools are enabled
    if (!this.config.enabledTools || this.config.enabledTools.length === 0) {
      return true;
    }
    return this.config.enabledTools.includes(toolName);
  }

  /**
   * Filter parameters from tool schema (hide hidden_params)
   */
  filterParameters(tool: Tool): Tool {
    if (!this.config.hiddenParams || this.config.hiddenParams.length === 0) {
      return tool;
    }

    const schema = { ...tool.inputSchema };

    // Remove hidden params from properties
    if (schema.properties) {
      schema.properties = Object.fromEntries(
        Object.entries(schema.properties).filter(([key]) => !this.config.hiddenParams!.includes(key))
      );
    }

    // Remove hidden params from required list
    if (schema.required) {
      schema.required = schema.required.filter(param => !this.config.hiddenParams!.includes(param));
    }

    logger.debug(`Filtered parameters for tool ${tool.name}: removed ${this.config.hiddenParams.join(', ')}`);
    return { ...tool, inputSchema: schema };
  }

  /**
   * Filter book and chapter notes from translation notes response
   * Preserves exact logic from Python implementation
   */
  filterBookChapterNotes(response: any): any {
    if (!this.config.filterBookChapterNotes) {
      return response;
    }

    // Only filter if response has items
    if (!response.items || !Array.isArray(response.items)) {
      return response;
    }

    const items = response.items;

    // Filter out book-level and chapter-level notes
    const filteredItems = items.filter((item: any) => {
      const reference = item.Reference || '';
      // Skip book-level notes (front:intro)
      if (reference === 'front:intro') {
        logger.debug('Filtered out book-level note: front:intro');
        return false;
      }
      // Skip chapter-level notes (e.g., "3:intro", "4:intro", etc.)
      if (reference.endsWith(':intro')) {
        logger.debug(`Filtered out chapter-level note: ${reference}`);
        return false;
      }
      // Keep verse-specific notes
      return true;
    });

    // Create a copy of the response with filtered items
    const filteredResponse = { ...response, items: filteredItems };

    // Update metadata totalCount if it exists
    if (filteredResponse.metadata && typeof filteredResponse.metadata.totalCount === 'number') {
      filteredResponse.metadata = {
        ...filteredResponse.metadata,
        totalCount: filteredItems.length
      };
    }

    logger.debug(`Filtered notes: ${items.length} -> ${filteredItems.length}`);
    return filteredResponse;
  }

  /**
   * Update filter configuration
   */
  updateConfig(config: Partial<FilterConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Updated filter configuration', this.config);
  }

  /**
   * Get current filter configuration
   */
  getConfig(): FilterConfig {
    return { ...this.config };
  }
}