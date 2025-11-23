/**
 * Integration tests for upstream server connectivity
 * These tests connect to the real upstream MCP server
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { UpstreamClient } from '../../src/core/upstream-client.js';
import { TranslationHelpsClient } from '../../src/core/index.js';

// Get upstream URL from environment or use default
const UPSTREAM_URL = process.env.UPSTREAM_MCP_URL || 'https://translation-helps-mcp.pages.dev/api/mcp';

describe('Upstream Server Connectivity (Integration)', () => {
  let upstreamClient: UpstreamClient;
  let translationHelpsClient: TranslationHelpsClient;

  beforeAll(() => {
    upstreamClient = new UpstreamClient({
      upstreamUrl: UPSTREAM_URL,
      timeout: 30000
    });

    translationHelpsClient = new TranslationHelpsClient({
      upstreamUrl: UPSTREAM_URL,
      timeout: 30000
    });
  });

  describe('Basic Connectivity', () => {
    it('should connect to upstream server and list tools', async () => {
      const tools = await upstreamClient.listTools();
      
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      console.log(`✅ Connected to upstream server`);
      console.log(`✅ Discovered ${tools.length} tools from upstream`);
    }, 30000);

    it('should discover exactly 11 tools', async () => {
      const tools = await upstreamClient.listTools();
      
      // If this fails, check if upstream added/removed tools at https://translation-helps-mcp.pages.dev/api/mcp
      expect(tools.length).toBe(11);
      
      console.log('📋 Available tools:');
      tools.slice(0, 3).forEach((tool, i) => {
        const desc = tool.description.substring(0, 50);
        console.log(`   ${i + 1}. ${tool.name}: ${desc}...`);
      });
      if (tools.length > 3) {
        console.log(`   ... and ${tools.length - 3} more tools`);
      }
    }, 30000);
  });

  describe('Tool List Format', () => {
    it('should return tools with correct format', async () => {
      const tools = await upstreamClient.listTools();
      
      expect(tools.length).toBeGreaterThan(0);
      
      // Check first tool has required fields
      const firstTool = tools[0];
      expect(firstTool).toHaveProperty('name');
      expect(firstTool).toHaveProperty('description');
      expect(firstTool).toHaveProperty('inputSchema');
      
      expect(typeof firstTool.name).toBe('string');
      expect(firstTool.name.length).toBeGreaterThan(0);
      expect(typeof firstTool.description).toBe('string');
      expect(firstTool.description.length).toBeGreaterThan(0);
      expect(typeof firstTool.inputSchema).toBe('object');
    }, 30000);

    it('should have valid input schemas', async () => {
      const tools = await upstreamClient.listTools();
      
      tools.forEach(tool => {
        expect(tool.inputSchema).toHaveProperty('type');
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema).toHaveProperty('properties');
        expect(typeof tool.inputSchema.properties).toBe('object');
      });
    }, 30000);
  });

  describe('TranslationHelpsClient Integration', () => {
    it('should test connection successfully', async () => {
      const connected = await translationHelpsClient.testConnection();
      
      expect(connected).toBe(true);
      console.log('✅ TranslationHelpsClient connected successfully');
    }, 30000);

    it('should list and filter tools', async () => {
      const tools = await translationHelpsClient.listTools();
      
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      console.log(`✅ TranslationHelpsClient listed ${tools.length} tools`);
    }, 30000);
  });

  describe('Expected Tools', () => {
    it('should include all 11 current tools from upstream', async () => {
      const tools = await upstreamClient.listTools();
      const toolNames = tools.map(t => t.name);
      
      // Current 11 tools from upstream as of v6.6.3
      // If this test fails, upstream may have changed. Verify at https://translation-helps-mcp.pages.dev/api/mcp
      const expectedTools = [
        'get_system_prompt',
        'fetch_scripture',
        'fetch_translation_notes',
        'get_languages',
        'fetch_translation_questions',
        'browse_translation_words',
        'get_context',
        'extract_references',
        'fetch_resources',
        'get_words_for_reference',
        'search_biblical_resources'
      ];
      
      expectedTools.forEach(expectedTool => {
        expect(toolNames).toContain(expectedTool);
      });
      
      console.log('✅ All expected 11 tools are available');
    }, 30000);
  });
});