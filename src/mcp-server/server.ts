/**
 * MCP Server implementation for HTTP transport
 * Uses @modelcontextprotocol/sdk Server class
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  TextContent,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { TranslationHelpsClient } from '../core/index.js';
import { logger } from '../shared/index.js';

export interface SSEServerConfig {
  enabledTools?: string[];
  hiddenParams?: string[];
  filterBookChapterNotes?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * MCP Server implementation for HTTP transport
 */
export class SSEMCPServer {
  private server: Server;
  private client: TranslationHelpsClient;
  private config: SSEServerConfig;

  constructor(config: SSEServerConfig = {}) {
    this.config = config;

    // Set log level
    if (config.logLevel) {
      logger.setLevel(config.logLevel);
    }

    // Initialize TranslationHelpsClient with configuration
    this.client = new TranslationHelpsClient({
      enabledTools: config.enabledTools,
      hiddenParams: config.hiddenParams,
      filterBookChapterNotes: config.filterBookChapterNotes,
    });

    // Initialize MCP Server
    this.server = new Server(
      {
        name: 'js-translation-helps-proxy',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.registerHandlers();
    logger.info('SSEMCPServer initialized', {
      enabledTools: config.enabledTools?.length || 'all',
      hiddenParams: config.hiddenParams?.length || 'none',
      filterBookChapterNotes: config.filterBookChapterNotes,
    });
  }

  /**
   * Register MCP method handlers
   */
  private registerHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        logger.debug('Handling tools/list request');

        const tools = await this.client.listTools();

        // Convert to MCP Tool format
        const mcpTools: Tool[] = tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));

        logger.info(`Returning ${mcpTools.length} tools`);
        return { tools: mcpTools };
      } catch (error) {
        logger.error('Error in tools/list handler', error);
        throw error;
      }
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args = {} } = request.params;

        logger.debug(`Handling tools/call request for tool: ${name}`, args);

        // Call the tool using TranslationHelpsClient
        const result = await this.client.callTool(name, args);

        logger.debug(`Tool ${name} executed successfully`);
        return { content: result };
      } catch (error) {
        logger.error(`Error in tools/call handler for tool ${request.params.name}`, error);

        // Return error as text content
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text', text: `Error: ${errorMessage}` } as TextContent],
          isError: true,
        };
      }
    });
  }

  /**
   * Get the underlying MCP Server instance
   */
  getServer(): Server {
    return this.server;
  }

  /**
   * Get the TranslationHelpsClient instance
   */
  getClient(): TranslationHelpsClient {
    return this.client;
  }

  /**
   * Update server configuration
   */
  updateConfig(config: Partial<SSEServerConfig>): void {
    this.config = { ...this.config, ...config };
    this.client.updateConfig(config);
    logger.info('Server configuration updated', config);
  }

  /**
   * Test connection to upstream server
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.client.testConnection();
    } catch (error) {
      logger.error('Connection test failed', error);
      return false;
    }
  }

  /**
   * Close the server and cleanup resources
   */
  async close(): Promise<void> {
    try {
      logger.info('Closing MCP server');
      await this.server.close();
      logger.info('MCP server closed');
    } catch (error) {
      logger.error('Error closing MCP server', error);
      throw error;
    }
  }
}