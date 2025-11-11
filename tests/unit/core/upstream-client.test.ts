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
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(client.listTools()).rejects.toThrow(UpstreamResponseError);
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(client.listTools()).rejects.toThrow(UpstreamConnectionError);
    });
  });

  describe('callTool', () => {
    it('should call fetch_scripture tool correctly', async () => {
      const mockResponse = {
        scripture: [{ text: 'In the beginning', translation: 'KJV' }]
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.callTool('fetch_scripture', { reference: 'Genesis 1:1' });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://test.example.com/api/fetch-scripture?reference=Genesis%201%3A1',
        expect.objectContaining({ method: 'GET' })
      );

      expect(result).toHaveLength(1);
      expect(result[0].text).toContain('In the beginning');
    });

    it('should call fetch_translation_notes tool correctly', async () => {
      const mockResponse = {
        items: [{ Note: 'Test note', Reference: 'John 3:16' }]
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.callTool('fetch_translation_notes', { reference: 'John 3:16' });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://test.example.com/api/translation-notes?reference=John%203%3A16',
        expect.objectContaining({ method: 'GET' })
      );

      expect(result).toHaveLength(1);
      expect(result[0].text).toContain('Test note');
    });

    it('should handle unknown tools by falling back to MCP endpoint', async () => {
      const mockResponse = { content: [{ type: 'text', text: 'Unknown tool result' }] };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.callTool('unknown_tool', { param: 'value' });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://test.example.com/api/mcp',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            method: 'tools/call',
            params: { name: 'unknown_tool', arguments: { param: 'value' } }
          })
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Unknown tool result');
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
    it('should route all expected tools to correct endpoints', async () => {
      const testCases = [
        {
          tool: 'fetch_scripture',
          args: { reference: 'John 3:16' },
          expectedUrl: 'https://test.example.com/api/fetch-scripture?reference=John%203%3A16'
        },
        {
          tool: 'fetch_translation_notes',
          args: { reference: 'John 3:16' },
          expectedUrl: 'https://test.example.com/api/translation-notes?reference=John%203%3A16'
        },
        {
          tool: 'fetch_translation_questions',
          args: { reference: 'John 3:16' },
          expectedUrl: 'https://test.example.com/api/translation-questions?reference=John%203%3A16'
        },
        {
          tool: 'get_translation_word',
          args: { reference: 'John 3:16' },
          expectedUrl: 'https://test.example.com/api/fetch-translation-words?reference=John%203%3A16'
        },
        {
          tool: 'browse_translation_words',
          args: { language: 'en' },
          expectedUrl: 'https://test.example.com/api/browse-translation-words?language=en'
        },
        {
          tool: 'get_context',
          args: { reference: 'John 3:16' },
          expectedUrl: 'https://test.example.com/api/get-context?reference=John%203%3A16'
        },
        {
          tool: 'extract_references',
          args: { text: 'John 3:16' },
          expectedUrl: 'https://test.example.com/api/extract-references?text=John%203%3A16'
        }
      ];

      for (const testCase of testCases) {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ result: 'success' })
        });

        await client.callTool(testCase.tool, testCase.args);

        expect(fetchMock).toHaveBeenCalledWith(
          testCase.expectedUrl,
          expect.objectContaining({ method: 'GET' })
        );
      }
    });
  });
});