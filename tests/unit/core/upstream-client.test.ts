/**
 * Unit tests for UpstreamClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UpstreamClient } from '../../../src/core/upstream-client.js';
import { UpstreamConnectionError, UpstreamResponseError } from '../../../src/shared/index.js';

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('UpstreamClient', () => {
  let client: UpstreamClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new UpstreamClient({
      upstreamUrl: 'https://test.example.com/api/mcp',
      timeout: 5000
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listTools', () => {
    it('should fetch tools successfully', async () => {
      const mockResponse = {
        tools: [
          {
            name: 'fetch_scripture',
            description: 'Fetch scripture',
            inputSchema: { type: 'object', properties: {} }
          }
        ]
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const tools = await client.listTools();

      expect(fetchMock).toHaveBeenCalledWith(
        'https://test.example.com/api/mcp?method=tools/list',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('fetch_scripture');
    });

    it('should handle upstream errors', async () => {
      // Mock 500 error for all retry attempts (1 initial + 3 retries = 4 total)
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(client.listTools()).rejects.toThrow(UpstreamResponseError);
      
      // Should have retried 3 times (4 total attempts)
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(client.listTools()).rejects.toThrow(UpstreamConnectionError);
    });
  });

  describe('callTool', () => {
    it('should call fetch_scripture tool via MCP passthrough', async () => {
      const mockResponse = {
        scripture: [{ text: 'In the beginning', translation: 'KJV' }]
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.callTool('fetch_scripture', { reference: 'Genesis 1:1' });

      // All tools now use MCP passthrough (POST to /api/mcp)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://test.example.com/api/mcp',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"method":"tools/call"'),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      // Should return raw response
      expect(result).toEqual(mockResponse);
      expect(result).toHaveProperty('scripture');
    });

    it('should call fetch_translation_notes tool via MCP passthrough', async () => {
      const mockResponse = {
        items: [{ Note: 'Test note', Reference: 'John 3:16' }],
        reference: 'John 3:16'
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.callTool('fetch_translation_notes', { reference: 'John 3:16' });

      // All tools now use MCP passthrough (POST to /api/mcp)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://test.example.com/api/mcp',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"method":"tools/call"'),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      // Should return raw response
      expect(result).toEqual(mockResponse);
      expect(result).toHaveProperty('items');
    });

    it('should handle all tools via MCP passthrough', async () => {
      const mockResponse = { content: [{ type: 'text', text: 'Tool result' }] };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.callTool('any_tool', { param: 'value' });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://test.example.com/api/mcp',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"method":"tools/call"'),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      // Should return raw response
      expect(result).toEqual(mockResponse);
    });

    it('should handle timeout', async () => {
      fetchMock.mockImplementationOnce(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 100);
      }));

      const fastClient = new UpstreamClient({
        upstreamUrl: 'https://test.example.com/api/mcp',
        timeout: 50
      });

      await expect(fastClient.callTool('fetch_scripture', { reference: 'test' }))
        .rejects.toThrow(UpstreamConnectionError);
    });
  });

  describe('routing logic', () => {
    it('should route all tools via MCP passthrough', async () => {
      const testCases = [
        { tool: 'fetch_scripture', args: { reference: 'John 3:16' } },
        { tool: 'fetch_translation_notes', args: { reference: 'John 3:16' } },
        { tool: 'fetch_translation_questions', args: { reference: 'John 3:16' } },
        { tool: 'get_words_for_reference', args: { reference: 'John 3:16' } },
        { tool: 'browse_translation_words', args: { language: 'en' } },
        { tool: 'get_context', args: { reference: 'John 3:16' } },
        { tool: 'extract_references', args: { text: 'John 3:16' } }
      ];

      for (const testCase of testCases) {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ result: 'success' })
        });

        await client.callTool(testCase.tool, testCase.args);

        // All tools now route to MCP endpoint with POST
        expect(fetchMock).toHaveBeenCalledWith(
          'https://test.example.com/api/mcp',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining(`"name":"${testCase.tool}"`),
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        );
      }
    });
  });
});