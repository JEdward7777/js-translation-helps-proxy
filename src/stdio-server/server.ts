/**
 * MCP Server implementation for stdio transport
 * Uses @modelcontextprotocol/sdk Server class with TranslationHelpsClient
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  TextContent,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { TranslationHelpsClient } from '../core/index.js';
import { logger } from '../shared/index.js';

export interface StdioServerConfig {
  enabledTools?: string[];
  hiddenParams?: string[];
  filterBookChapterNotes?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * MCP Server implementation using stdio transport
 */
export class StdioMCPServer {
  private server: Server;
  private client: TranslationHelpsClient;
  private config: StdioServerConfig;

  constructor(config: StdioServerConfig = {}) {
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
    logger.info('StdioMCPServer initialized', {
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
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting MCP server with stdio transport');

      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('MCP server started successfully');
    } catch (error) {
      logger.error('Failed to start MCP server', error);
      throw error;
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
}