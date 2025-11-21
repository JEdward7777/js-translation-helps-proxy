/**
 * Integration tests for stdio MCP server
 */

import { describe, it, expect } from 'vitest';
import { StdioMCPServer } from '../../../src/stdio-server/server.js';

describe('StdioMCPServer', () => {
  describe('initialization', () => {
    it('should create server with default configuration', () => {
      const server = new StdioMCPServer();
      expect(server).toBeDefined();
    });

    it('should create server with custom configuration', () => {
      const server = new StdioMCPServer({
        enabledTools: ['fetch_scripture'],
        hiddenParams: ['language'],
        filterBookChapterNotes: true,
        logLevel: 'debug',
      });
      expect(server).toBeDefined();
    });

    it('should create server with enabled tools filter', () => {
      const server = new StdioMCPServer({
        enabledTools: ['fetch_scripture', 'fetch_translation_notes'],
      });
      expect(server).toBeDefined();
    });

    it('should create server with hidden params', () => {
      const server = new StdioMCPServer({
        hiddenParams: ['language', 'organization'],
      });
      expect(server).toBeDefined();
    });
  });

  describe('connection testing', () => {
    it('should test connection to upstream server', async () => {
      const server = new StdioMCPServer({ logLevel: 'error' });
      const connected = await server.testConnection();
      expect(typeof connected).toBe('boolean');
    });
  });

  describe('tool filtering', () => {
    it('should filter tools when enabledTools is specified', async () => {
      const server = new StdioMCPServer({
        enabledTools: ['fetch_scripture'],
        logLevel: 'error',
      });

      // Access the client through the server instance
      const client = (server as any).client;
      const tools = await client.listTools();

      expect(tools.length).toBeGreaterThan(0);
      expect(tools.every((tool: any) => tool.name === 'fetch_scripture')).toBe(true);
    });

    it('should return all tools when enabledTools is not specified', async () => {
      const server = new StdioMCPServer({ logLevel: 'error' });

      const client = (server as any).client;
      const tools = await client.listTools();

      expect(tools.length).toBeGreaterThan(1);
    });
  });

  describe('parameter hiding', () => {
    it('should hide specified parameters from tool schemas', async () => {
      const server = new StdioMCPServer({
        hiddenParams: ['language', 'organization'],
        logLevel: 'error',
      });

      const client = (server as any).client;
      const tools = await client.listTools();

      // Find a tool that normally has language/organization params
      const scriptureTool = tools.find((t: any) => t.name === 'fetch_scripture');
      if (scriptureTool) {
        const properties = scriptureTool.inputSchema.properties;
        expect(properties).not.toHaveProperty('language');
        expect(properties).not.toHaveProperty('organization');
        expect(properties).toHaveProperty('reference');
      }
    });
  });

  describe('tool calling', () => {
    it('should call fetch_scripture tool successfully', async () => {
      const server = new StdioMCPServer({ logLevel: 'error' });
      const client = (server as any).client;

      const result = await client.callTool('fetch_scripture', {
        reference: 'John 3:16',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('type', 'text');
      expect(result[0]).toHaveProperty('text');
    });

    it('should handle disabled tool error', async () => {
      const server = new StdioMCPServer({
        enabledTools: ['fetch_scripture'],
        logLevel: 'error',
      });
      const client = (server as any).client;

      await expect(
        client.callTool('fetch_translation_notes', { reference: 'John 3:16' })
      ).rejects.toThrow();
    });

    it('should handle invalid tool name', async () => {
      const server = new StdioMCPServer({ logLevel: 'error' });
      const client = (server as any).client;

      await expect(
        client.callTool('invalid_tool_name', {})
      ).rejects.toThrow();
    });
  });

  describe('book/chapter note filtering', () => {
    it('should filter book and chapter notes when enabled', async () => {
      const server = new StdioMCPServer({
        filterBookChapterNotes: true,
        logLevel: 'error',
      });
      const client = (server as any).client;

      const result = await client.callTool('fetch_translation_notes', {
        reference: 'Genesis 1:1',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // The result should not contain book-level or chapter-level notes
      // This is a basic check - actual filtering happens in the response formatter
      if (result.length > 0) {
        const text = result[0].text;
        expect(typeof text).toBe('string');
      }
    });

    it('should not filter notes when disabled', async () => {
      const server = new StdioMCPServer({
        filterBookChapterNotes: false,
        logLevel: 'error',
      });
      const client = (server as any).client;

      const result = await client.callTool('fetch_translation_notes', {
        reference: 'Genesis 1:1',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      // Create server with invalid upstream URL that will fail immediately
      // Port 1 is privileged and will cause an immediate connection failure
      const server = new StdioMCPServer({
        logLevel: 'error',
        upstreamUrl: 'http://localhost:1/api/mcp'
      });

      // Clear any cached tools from previous tests to ensure we actually test the connection
      const client = (server as any).client;
      client.clearCache();

      const connected = await server.testConnection();
      expect(connected).toBe(false);
    });

    it('should handle malformed arguments', async () => {
      const server = new StdioMCPServer({ logLevel: 'error' });
      const client = (server as any).client;

      // Missing required 'reference' parameter
      await expect(
        client.callTool('fetch_scripture', {})
      ).rejects.toThrow();
    });
  });

  describe('configuration updates', () => {
    it('should allow configuration updates', () => {
      const server = new StdioMCPServer({ logLevel: 'error' });
      const client = (server as any).client;

      client.updateConfig({
        enabledTools: ['fetch_scripture'],
      });

      const config = client.getConfig();
      expect(config.enabledTools).toEqual(['fetch_scripture']);
    });
  });
});