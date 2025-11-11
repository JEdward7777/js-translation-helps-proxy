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
    it('should call tool successfully', async () => {
      const mockResult = [{ type: 'text', text: 'Success' }];

      (client as any).filterEngine.isToolEnabled.mockReturnValue(true);
      mockToolRegistry.hasTool.mockResolvedValue(true);
      mockToolRegistry.validateToolArgs.mockResolvedValue(true);
      mockUpstreamClient.callTool.mockResolvedValue([{ type: 'text', text: 'raw response' }]);
      (client as any).filterEngine.filterBookChapterNotes.mockReturnValue([{ type: 'text', text: 'raw response' }]);
      (ResponseFormatter.formatResponse as any).mockReturnValue(mockResult);

      const result = await client.callTool('fetch_scripture', { reference: 'John 3:16' });

      expect(mockToolRegistry.hasTool).toHaveBeenCalledWith('fetch_scripture');
      expect(mockToolRegistry.validateToolArgs).toHaveBeenCalledWith('fetch_scripture', { reference: 'John 3:16' });
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('fetch_scripture', { reference: 'John 3:16' });
      expect((client as any).filterEngine.filterBookChapterNotes).toHaveBeenCalled();
      expect(ResponseFormatter.formatResponse).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
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

  describe('type-safe tool methods', () => {
    beforeEach(() => {
      (client as any).filterEngine.isToolEnabled.mockReturnValue(true);
      mockToolRegistry.hasTool.mockResolvedValue(true);
      mockToolRegistry.validateToolArgs.mockResolvedValue(true);
      mockUpstreamClient.callTool.mockResolvedValue([{ type: 'text', text: 'Test' }]);
      (client as any).filterEngine.filterBookChapterNotes.mockReturnValue([{ type: 'text', text: 'Test' }]);
      (ResponseFormatter.formatResponse as any).mockReturnValue([{ type: 'text', text: 'Test response' }]);
    });

    it('should call fetchScripture', async () => {
      const result = await client.fetchScripture({ reference: 'John 3:16' });
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('fetch_scripture', { reference: 'John 3:16' });
      expect(result).toHaveLength(1);
    });

    it('should call fetchTranslationNotes', async () => {
      const result = await client.fetchTranslationNotes({ reference: 'John 3:16' });
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('fetch_translation_notes', { reference: 'John 3:16' });
      expect(result).toHaveLength(1);
    });

    it('should call getSystemPrompt', async () => {
      const result = await client.getSystemPrompt();
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('get_system_prompt', {});
      expect(result).toHaveLength(1);
    });

    it('should call fetchTranslationQuestions', async () => {
      const result = await client.fetchTranslationQuestions({ reference: 'John 3:16' });
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('fetch_translation_questions', { reference: 'John 3:16' });
      expect(result).toHaveLength(1);
    });

    it('should call getTranslationWord', async () => {
      const result = await client.getTranslationWord({ reference: 'John 3:16' });
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('get_translation_word', { reference: 'John 3:16' });
      expect(result).toHaveLength(1);
    });

    it('should call browseTranslationWords', async () => {
      const result = await client.browseTranslationWords();
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('browse_translation_words', {});
      expect(result).toHaveLength(1);
    });

    it('should call getContext', async () => {
      const result = await client.getContext({ reference: 'John 3:16' });
      expect(mockUpstreamClient.callTool).toHaveBeenCalledWith('get_context', { reference: 'John 3:16' });
      expect(result).toHaveLength(1);
    });

    it('should call extractReferences', async () => {
      const result = await client.extractReferences({ text: 'John 3:16' });
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