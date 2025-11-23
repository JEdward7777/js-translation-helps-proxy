/**
 * Unit tests for TranslationHelpsClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TranslationHelpsClient } from '../../../src/core/index.js';
import { ToolNotFoundError, ToolDisabledError, InvalidArgumentsError } from '../../../src/shared/index.js';
import { ResponseFormatter } from '../../../src/core/response-formatter.js';

// Mock the upstream client
vi.mock('../../../src/core/upstream-client.js', () => ({
  UpstreamClient: class {
    listTools = vi.fn();
    callTool = vi.fn();
  }
}));

// Mock the tool registry
vi.mock('../../../src/core/tool-registry.js', () => ({
  ToolRegistry: class {
    getAllTools = vi.fn();
    getTool = vi.fn();
    hasTool = vi.fn();
    validateToolArgs = vi.fn();
    clearCache = vi.fn();
    getCacheStatus = vi.fn();
  }
}));

// Mock the filter engine
vi.mock('../../../src/core/filter-engine.js', () => ({
  FilterEngine: class {
    filterTools = vi.fn();
    isToolEnabled = vi.fn();
    filterBookChapterNotes = vi.fn();
    updateConfig = vi.fn();
    getConfig = vi.fn();
  }
}));

// Mock the response formatter
vi.mock('../../../src/core/response-formatter.js', () => ({
  ResponseFormatter: {
    formatResponse: vi.fn(),
    formatError: vi.fn(),
    formatSuccess: vi.fn()
  }
}));

describe('TranslationHelpsClient', () => {
  let client: TranslationHelpsClient;
  let mockUpstreamClient: any;
  let mockToolRegistry: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create client with test configuration
    client = new TranslationHelpsClient({
      upstreamUrl: 'https://test.example.com/api/mcp',
      enabledTools: ['fetch_scripture', 'fetch_translation_notes'],
      hiddenParams: ['language'],
      filterBookChapterNotes: true
    });

    // Get the mocked instances
    mockUpstreamClient = (client as any).upstreamClient;
    mockToolRegistry = (client as any).toolRegistry;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultClient = new TranslationHelpsClient();
      expect(defaultClient).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      expect(client).toBeDefined();
      expect(client.getConfig()).toEqual({
        upstreamUrl: 'https://test.example.com/api/mcp',
        enabledTools: ['fetch_scripture', 'fetch_translation_notes'],
        hiddenParams: ['language'],
        filterBookChapterNotes: true
      });
    });
  });

  describe('listTools', () => {
    it('should list and filter tools', async () => {
      const mockTools = [
        { name: 'fetch_scripture', description: 'Fetch scripture' },
        { name: 'fetch_translation_notes', description: 'Fetch notes' },
        { name: 'get_system_prompt', description: 'Get prompt' }
      ];

      mockToolRegistry.getAllTools.mockResolvedValue(mockTools);
      (client as any).filterEngine.filterTools.mockReturnValue(mockTools.slice(0, 2));

      const tools = await client.listTools();

      expect(mockToolRegistry.getAllTools).toHaveBeenCalled();
      expect((client as any).filterEngine.filterTools).toHaveBeenCalledWith(mockTools);
      expect(tools).toHaveLength(2);
    });
  });

  describe('callTool', () => {
    it('should call tool successfully with proper order of operations', async () => {
      const mockRawResponse = { scripture: [{ text: 'In the beginning' }] };
      const mockFilteredResponse = { scripture: [{ text: 'In the beginning' }] };
      const mockFormattedResult = [{ type: 'text', text: 'Success' }];

      (client as any).filterEngine.isToolEnabled.mockReturnValue(true);
      mockToolRegistry.hasTool.mockResolvedValue(true);
      mockToolRegistry.validateToolArgs.mockResolvedValue(true);
      // UpstreamClient now returns raw response
      mockUpstreamClient.callTool.mockResolvedValue(mockRawResponse);
      // Filter operates on raw response
      (client as any).filterEngine.filterBookChapterNotes.mockReturnValue(mockFilteredResponse);
      // Formatter operates on filtered response
      (ResponseFormatter.formatResponse as any).mockReturnValue(mockFormattedResult);

      const result = await client.callTool('fetch_scripture', { reference: 'John 3:16' });

      expect(mockToolRegistry.hasTool).toHaveBeenCalledWith('fetch_scripture');
      expect(mockToolRegistry.validateToolArgs).toHaveBeenCalledWith('fetch_scripture', { reference: 'John 3:16' });
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('fetch_scripture', { reference: 'John 3:16' });
      // Filter should be called with raw response
      expect((client as any).filterEngine.filterBookChapterNotes).toHaveBeenCalledWith(mockRawResponse);
      // Formatter should be called with filtered response
      expect(ResponseFormatter.formatResponse).toHaveBeenCalledWith(mockFilteredResponse);
      expect(result).toEqual(mockFormattedResult);
    });

    it('should throw ToolDisabledError for disabled tools', async () => {
      (client as any).filterEngine.isToolEnabled.mockReturnValue(false);

      await expect(client.callTool('disabled_tool', {}))
        .rejects.toThrow(ToolDisabledError);
    });

    it('should throw ToolNotFoundError for non-existent tools', async () => {
      (client as any).filterEngine.isToolEnabled.mockReturnValue(true);
      mockToolRegistry.hasTool.mockResolvedValue(false);

      await expect(client.callTool('non_existent_tool', {}))
        .rejects.toThrow(ToolNotFoundError);
    });

    it('should throw InvalidArgumentsError for invalid arguments', async () => {
      (client as any).filterEngine.isToolEnabled.mockReturnValue(true);
      mockToolRegistry.hasTool.mockResolvedValue(true);
      mockToolRegistry.validateToolArgs.mockResolvedValue(false);

      await expect(client.callTool('fetch_scripture', {}))
        .rejects.toThrow(InvalidArgumentsError);
    });
  });

  describe('generic callTool method', () => {
    beforeEach(() => {
      (client as any).filterEngine.isToolEnabled.mockReturnValue(true);
      mockToolRegistry.hasTool.mockResolvedValue(true);
      mockToolRegistry.validateToolArgs.mockResolvedValue(true);
      // UpstreamClient now returns raw response objects
      mockUpstreamClient.callTool.mockResolvedValue({ result: 'raw data' });
      (client as any).filterEngine.filterBookChapterNotes.mockReturnValue({ result: 'filtered data' });
      (ResponseFormatter.formatResponse as any).mockReturnValue([{ type: 'text', text: 'Test response' }]);
    });

    it('should call fetch_scripture via callTool', async () => {
      const result = await client.callTool('fetch_scripture', { reference: 'John 3:16' });
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('fetch_scripture', { reference: 'John 3:16' });
      expect(result).toHaveLength(1);
    });

    it('should call fetch_translation_notes via callTool', async () => {
      const result = await client.callTool('fetch_translation_notes', { reference: 'John 3:16' });
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('fetch_translation_notes', { reference: 'John 3:16' });
      expect(result).toHaveLength(1);
    });

    it('should call get_system_prompt via callTool', async () => {
      const result = await client.callTool('get_system_prompt', {});
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('get_system_prompt', {});
      expect(result).toHaveLength(1);
    });

    it('should call fetch_translation_questions via callTool', async () => {
      const result = await client.callTool('fetch_translation_questions', { reference: 'John 3:16' });
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('fetch_translation_questions', { reference: 'John 3:16' });
      expect(result).toHaveLength(1);
    });

    it('should call get_words_for_reference via callTool', async () => {
      const result = await client.callTool('get_words_for_reference', { reference: 'John 3:16' });
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('get_words_for_reference', { reference: 'John 3:16' });
      expect(result).toHaveLength(1);
    });

    it('should call browse_translation_words via callTool', async () => {
      const result = await client.callTool('browse_translation_words', {});
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('browse_translation_words', {});
      expect(result).toHaveLength(1);
    });

    it('should call get_context via callTool', async () => {
      const result = await client.callTool('get_context', { reference: 'John 3:16' });
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('get_context', { reference: 'John 3:16' });
      expect(result).toHaveLength(1);
    });

    it('should call extract_references via callTool', async () => {
      const result = await client.callTool('extract_references', { text: 'John 3:16' });
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('extract_references', { text: 'John 3:16' });
      expect(result).toHaveLength(1);
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      client.updateConfig({ filterBookChapterNotes: false });
      expect(client.getConfig().filterBookChapterNotes).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should test connection', async () => {
      mockToolRegistry.getAllTools.mockResolvedValue([]);

      const result = await client.testConnection();
      expect(result).toBe(false); // Mock returns empty array, so connection test fails
      expect(mockToolRegistry.getAllTools).toHaveBeenCalled();
    });

    it('should handle connection test failure', async () => {
      mockToolRegistry.getAllTools.mockRejectedValue(new Error('Connection failed'));

      const result = await client.testConnection();
      expect(result).toBe(false);
    });

    it('should clear cache', () => {
      client.clearCache();
      expect(mockToolRegistry.clearCache).toHaveBeenCalled();
    });

    it('should get cache status', () => {
      mockToolRegistry.getCacheStatus.mockReturnValue({ hasCache: true, age: 1000, toolCount: 5 });
      const status = client.getCacheStatus();
      expect(status).toEqual({ hasCache: true, age: 1000, toolCount: 5 });
    });
  });
});