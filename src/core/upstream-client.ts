/**
 * HTTP client for communicating with the upstream Translation Helps API
 * Preserves exact routing logic from Python implementation
 */

import {
  UpstreamClientConfig,
  Tool,
  UpstreamResponse,
  UpstreamConnectionError,
  UpstreamResponseError,
} from './types.js';
import { logger } from '../shared/index.js';

export class UpstreamClient {
  private config: Required<UpstreamClientConfig>;

  constructor(config: UpstreamClientConfig) {
    this.config = {
      upstreamUrl: config.upstreamUrl,
      timeout: config.timeout ?? 30000,
      headers: config.headers ?? {},
      
      // Retry configuration with defaults
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      retryBackoff: config.retryBackoff ?? 2,
      retryableStatusCodes: config.retryableStatusCodes ?? [408, 429, 500, 502, 503, 504]
    };
    
    logger.info('UpstreamClient initialized', {
      upstreamUrl: this.config.upstreamUrl,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      retryBackoff: this.config.retryBackoff
    });
  }

  /**
   * List all available tools from upstream
   */
  async listTools(): Promise<Tool[]> {
    try {
      logger.debug('Fetching tools from upstream');
      const response = await this.callUpstream('tools/list', {});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic upstream response format
      if (!response || !('tools' in response) || !Array.isArray((response as any).tools)) {
        throw new UpstreamResponseError('Invalid tools response from upstream');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic upstream response format
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic tool arguments
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic method parameters
  private async callUpstream(method: string, params: Record<string, any>): Promise<UpstreamResponse | null> {
    try {
      let response: Response;
      let url: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic request body
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic tool arguments
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
   * Fetch with timeout and retry support
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    attempt: number = 1
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      logger.debug(`Fetch attempt ${attempt}/${this.config.maxRetries + 1}`, { url });
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Check if response status is retryable
      if (!response.ok && this.isRetryableStatus(response.status)) {
        throw new UpstreamResponseError(
          `Upstream server returned ${response.status}: ${response.statusText}`,
          response.status
        );
      }
      
      return response;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Determine if error is retryable
      const isRetryable = this.isRetryableError(error);
      const hasRetriesLeft = attempt <= this.config.maxRetries;
      
      if (isRetryable && hasRetriesLeft) {
        // Calculate delay with exponential backoff
        const delay = this.calculateRetryDelay(attempt);
        
        logger.warn(
          `Request failed (attempt ${attempt}/${this.config.maxRetries + 1}), ` +
          `retrying in ${delay}ms`,
          { error: error instanceof Error ? error.message : String(error), url }
        );
        
        // Wait before retrying
        await this.sleep(delay);
        
        // Recursive retry
        return this.fetchWithTimeout(url, options, attempt + 1);
      }
      
      // No more retries or non-retryable error
      logger.error(
        `Request failed after ${attempt} attempt(s)`,
        { error, url }
      );
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new UpstreamConnectionError(
          `Request timed out after ${this.config.timeout}ms`
        );
      }
      
      throw error;
    }
  }

  /**
   * Build query string from object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic query parameters
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

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    // Network errors are retryable
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }
    
    // Timeout errors are retryable
    if (error instanceof Error && error.name === 'AbortError') {
      return true;
    }
    
    // Upstream response errors with retryable status codes
    if (error instanceof UpstreamResponseError) {
      return this.isRetryableStatus(error.statusCode);
    }
    
    // Other errors are not retryable
    return false;
  }

  /**
   * Determine if HTTP status code is retryable
   */
  private isRetryableStatus(statusCode?: number): boolean {
    if (!statusCode) return false;
    
    const retryableStatusCodes = this.config.retryableStatusCodes ?? [
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504  // Gateway Timeout
    ];
    
    return retryableStatusCodes.includes(statusCode);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay ?? 1000;
    const backoff = this.config.retryBackoff ?? 2;
    
    // Calculate: baseDelay * (backoff ^ (attempt - 1))
    // Attempt 1: baseDelay * 1 = baseDelay
    // Attempt 2: baseDelay * backoff = baseDelay * 2
    // Attempt 3: baseDelay * backoff^2 = baseDelay * 4
    return baseDelay * Math.pow(backoff, attempt - 1);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}