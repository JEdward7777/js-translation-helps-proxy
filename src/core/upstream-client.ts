/**
 * HTTP client for communicating with the upstream Translation Helps API
 * Preserves exact routing logic from Python implementation
 */

import {
  UpstreamClientConfig,
  Tool,
  ToolResult,
  TextContent,
  UpstreamResponse,
  UpstreamConnectionError,
  UpstreamResponseError,
  InvalidArgumentsError
} from './types.js';
import { logger } from '../shared/index.js';

export class UpstreamClient {
  private config: Required<UpstreamClientConfig>;

  constructor(config: UpstreamClientConfig) {
    this.config = {
      upstreamUrl: config.upstreamUrl,
      timeout: config.timeout ?? 30000,
      headers: config.headers ?? {}
    };
  }

  /**
   * List all available tools from upstream
   */
  async listTools(): Promise<Tool[]> {
    try {
      logger.debug('Fetching tools from upstream');
      const response = await this.callUpstream('tools/list', {});
      if (!response || !('tools' in response) || !Array.isArray((response as any).tools)) {
        throw new UpstreamResponseError('Invalid tools response from upstream');
      }

      const tools: Tool[] = (response as any).tools.map((toolData: any) => ({
        name: toolData.name,
        description: toolData.description,
        inputSchema: toolData.inputSchema
      }));

      logger.info(`Retrieved ${tools.length} tools from upstream`);
      return tools;
    } catch (error) {
      logger.error('Failed to list tools from upstream', error);
      throw error;
    }
  }

  /**
   * Call a specific tool on the upstream server
   * Returns raw response for filtering and formatting by the caller
   */
  async callTool(name: string, args: Record<string, any>): Promise<UpstreamResponse | null> {
    try {
      logger.debug(`Calling tool: ${name}`, args);
      const response = await this.callUpstream('tools/call', {
        name,
        arguments: args
      });

      return response;
    } catch (error) {
      logger.error(`Failed to call tool ${name}`, error);
      throw error;
    }
  }

  /**
   * Internal method to call upstream server with routing logic
   */
  private async callUpstream(method: string, params: Record<string, any>): Promise<UpstreamResponse | null> {
    try {
      let response: Response;
      let url: string;
      let body: any = null;

      if (method === 'tools/list') {
        // For tools/list, use GET method
        url = `${this.config.upstreamUrl}?method=tools/list`;
        response = await this.fetchWithTimeout(url, {
          method: 'GET',
          headers: this.getHeaders()
        });
      } else if (method === 'tools/call') {
        // Route tool calls to specific endpoints
        const toolCall = this.routeToolCall(params.name, params.arguments);
        url = toolCall.url;
        response = await this.fetchWithTimeout(url, toolCall.options);
      } else {
        // Fallback for other methods
        url = this.config.upstreamUrl;
        body = { method, params };
        response = await this.fetchWithTimeout(url, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body)
        });
      }

      if (!response.ok) {
        throw new UpstreamResponseError(
          `Upstream server returned ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      logger.debug(`Upstream response for ${method}`, { status: response.status, dataKeys: Object.keys(data) });

      return data;
    } catch (error) {
      if (error instanceof UpstreamResponseError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new UpstreamConnectionError(`Network error: ${error.message}`);
      }

      throw new UpstreamConnectionError(`Failed to call upstream: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Route tool calls to specific API endpoints (preserved from Python)
   */
  private routeToolCall(toolName: string, args: Record<string, any>): { url: string; options: RequestInit } {
    const baseUrl = this.config.upstreamUrl.replace('/api/mcp', '');

    switch (toolName) {
      case 'fetch_scripture':
        return {
          url: `${baseUrl}/api/fetch-scripture?${this.buildQueryString({
            reference: args.reference,
            language: args.language,
            organization: args.organization
          })}`,
          options: { method: 'GET', headers: this.getHeaders() }
        };

      case 'fetch_translation_notes':
        return {
          url: `${baseUrl}/api/translation-notes?${this.buildQueryString({
            reference: args.reference,
            language: args.language,
            organization: args.organization
          })}`,
          options: { method: 'GET', headers: this.getHeaders() }
        };

      case 'fetch_translation_questions':
        return {
          url: `${baseUrl}/api/translation-questions?${this.buildQueryString({
            reference: args.reference,
            language: args.language,
            organization: args.organization
          })}`,
          options: { method: 'GET', headers: this.getHeaders() }
        };

      case 'get_translation_word':
      case 'fetch_translation_words':
        return {
          url: `${baseUrl}/api/fetch-translation-words?${this.buildQueryString({
            reference: args.reference,
            wordId: args.wordId,
            language: args.language,
            organization: args.organization
          })}`,
          options: { method: 'GET', headers: this.getHeaders() }
        };

      case 'browse_translation_words':
        return {
          url: `${baseUrl}/api/browse-translation-words?${this.buildQueryString({
            language: args.language,
            organization: args.organization,
            category: args.category,
            search: args.search,
            limit: args.limit
          })}`,
          options: { method: 'GET', headers: this.getHeaders() }
        };

      case 'get_context':
        return {
          url: `${baseUrl}/api/get-context?${this.buildQueryString({
            reference: args.reference,
            language: args.language,
            organization: args.organization
          })}`,
          options: { method: 'GET', headers: this.getHeaders() }
        };

      case 'extract_references':
        return {
          url: `${baseUrl}/api/extract-references?${this.buildQueryString({
            text: args.text,
            includeContext: args.includeContext
          })}`,
          options: { method: 'GET', headers: this.getHeaders() }
        };

      default:
        // Fallback to MCP endpoint
        return {
          url: this.config.upstreamUrl,
          options: {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
              method: 'tools/call',
              params: { name: toolName, arguments: args }
            })
          }
        };
    }
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new UpstreamConnectionError(`Request timed out after ${this.config.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Build query string from object
   */
  private buildQueryString(params: Record<string, any>): string {
    const filtered = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    return filtered.join('&');
  }

  /**
   * Get headers for requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.config.headers
    };
  }
}