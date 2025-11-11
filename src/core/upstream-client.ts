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
   */
  async callTool(name: string, args: Record<string, any>): Promise<ToolResult> {
    try {
      logger.debug(`Calling tool: ${name}`, args);
      const response = await this.callUpstream('tools/call', {
        name,
        arguments: args
      });

      if (!response) {
        return [{ type: 'text', text: 'No response from upstream server' } as TextContent];
      }

      // Format the response using the same logic as Python version
      return this.formatResponse(response);
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
   * Format upstream response to MCP TextContent (preserved from Python)
   */
  private formatResponse(response: UpstreamResponse): TextContent[] {
    // Handle MCP-like format
    if ('content' in response && Array.isArray(response.content)) {
      return response.content.map((item: any) => {
        if (item.type === 'text') {
          return { type: 'text', text: item.text } as TextContent;
        }
        return { type: 'text', text: JSON.stringify(item) } as TextContent;
      });
    }

    // Scripture format
    if ('scripture' in response && Array.isArray(response.scripture)) {
      const formatted = response.scripture.map((s: any) => {
        let text = s.text;
        if (s.translation) {
          text += ` (${s.translation})`;
        }
        return text;
      }).join('\n\n');
      return [{ type: 'text', text: formatted } as TextContent];
    }

    // Translation notes format
    if ('notes' in response || 'verseNotes' in response || 'items' in response) {
      const notes = response.notes || response.verseNotes || response.items;
      if (Array.isArray(notes) && notes.length > 0) {
        let text = `Translation Notes for ${(response as any).reference || 'Reference'}:\n\n`;
        notes.forEach((note: any, i: number) => {
          const content = note.Note || note.note || note.text || note.content || String(note);
          text += `${i + 1}. ${content}\n\n`;
        });
        return [{ type: 'text', text } as TextContent];
      } else {
        return [{ type: 'text', text: 'No translation notes found for this reference.' } as TextContent];
      }
    }

    // Translation words format
    if ('words' in response && Array.isArray(response.words)) {
      if (response.words.length > 0) {
        let text = `Translation Words for ${(response as any).reference || 'Reference'}:\n\n`;
        response.words.forEach((word: any) => {
          const term = word.term || word.name || 'Unknown Term';
          const definition = word.definition || word.content || 'No definition available';
          text += `**${term}**\n${definition}\n\n`;
        });
        return [{ type: 'text', text } as TextContent];
      } else {
        return [{ type: 'text', text: 'No translation words found for this reference.' } as TextContent];
      }
    }

    // Single translation word format
    if ('term' in response && 'definition' in response) {
      const text = `**${response.term}**\n${response.definition}`;
      return [{ type: 'text', text } as TextContent];
    }

    // Translation questions format
    if ('questions' in response && Array.isArray(response.questions)) {
      if (response.questions.length > 0) {
        let text = `Translation Questions for ${(response as any).reference || 'Reference'}:\n\n`;
        response.questions.forEach((q: any, i: number) => {
          const question = q.question || q.Question || 'No question';
          const answer = q.answer || q.Answer || 'No answer';
          text += `Q${i + 1}: ${question}\nA: ${answer}\n\n`;
        });
        return [{ type: 'text', text } as TextContent];
      } else {
        return [{ type: 'text', text: 'No translation questions found for this reference.' } as TextContent];
      }
    }

    // Wrapped result format
    if ('result' in response) {
      const text = typeof response.result === 'string'
        ? response.result
        : JSON.stringify(response.result, null, 2);
      return [{ type: 'text', text } as TextContent];
    }

    // Fallback: stringify the whole response
    const text = JSON.stringify(response, null, 2);
    return [{ type: 'text', text } as TextContent];
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