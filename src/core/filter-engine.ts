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
   * Handles both raw response format and MCP-wrapped format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic upstream response format
  filterBookChapterNotes(response: any): any {
    if (!this.config.filterBookChapterNotes) {
      return response;
    }

    // Handle MCP-wrapped response format (content array with JSON string)
    if (response && response.content && Array.isArray(response.content) && response.content.length > 0) {
      const firstContent = response.content[0];
      if (firstContent.type === 'text' && typeof firstContent.text === 'string') {
        try {
          // Parse the JSON string to get the actual data
          const parsedData = JSON.parse(firstContent.text);
          
          // Apply filtering to the parsed data
          const filteredData = this.filterBookChapterNotesFromData(parsedData);
          
          // Re-wrap the filtered data back into MCP format
          return {
            ...response,
            content: [{
              type: 'text',
              text: JSON.stringify(filteredData)
            }]
          };
        } catch (error) {
          logger.warn('Failed to parse MCP content for filtering', error);
          return response;
        }
      }
    }

    // Handle raw response format (direct items array)
    return this.filterBookChapterNotesFromData(response);
  }

  /**
   * Internal method to filter book and chapter notes from the actual data structure
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic upstream response format
  private filterBookChapterNotesFromData(data: any): any {
    // Only filter if data has items
    if (!data.items || !Array.isArray(data.items)) {
      return data;
    }

    const items = data.items;

    // Filter out book-level and chapter-level notes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic upstream response format
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

    // Create a copy of the data with filtered items
    const filteredData = { ...data, items: filteredItems };

    // Update metadata totalCount if it exists
    if (filteredData.metadata && typeof filteredData.metadata.totalCount === 'number') {
      filteredData.metadata = {
        ...filteredData.metadata,
        totalCount: filteredItems.length
      };
    }

    logger.debug(`Filtered notes: ${items.length} -> ${filteredItems.length}`);
    return filteredData;
  }

  /**
   * Filter hidden parameters from tool arguments
   * Removes any parameters that are in the hiddenParams list
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic tool arguments
  filterArguments(args: Record<string, any>): Record<string, any> {
    if (!this.config.hiddenParams || this.config.hiddenParams.length === 0) {
      return args;
    }

    // Create a copy of args without hidden parameters
    const filteredArgs = Object.fromEntries(
      Object.entries(args).filter(([key]) => !this.config.hiddenParams!.includes(key))
    );

    if (Object.keys(args).length !== Object.keys(filteredArgs).length) {
      const removedParams = Object.keys(args).filter(key => !Object.keys(filteredArgs).includes(key));
      logger.debug(`Filtered out hidden parameters from arguments: ${removedParams.join(', ')}`);
    }

    return filteredArgs;
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