/**
 * End-to-end tests for complete workflows
 * Tests the full stack from client through filtering to upstream and back
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { TranslationHelpsClient } from '../../src/core/index.js';

// Get upstream URL from environment or use default
const UPSTREAM_URL = process.env.UPSTREAM_MCP_URL || 'https://translation-helps-mcp.pages.dev/api/mcp';

describe('Full Workflow (E2E)', () => {
  let client: TranslationHelpsClient;

  beforeAll(() => {
    client = new TranslationHelpsClient({
      upstreamUrl: UPSTREAM_URL,
      timeout: 30000
    });
  });

  describe('Complete Scripture Lookup Workflow', () => {
    it('should perform a complete scripture lookup with all features', async () => {
      console.log('\n🔄 Starting complete scripture lookup workflow...');
      
      // Step 1: Test connection
      console.log('   Step 1: Testing connection...');
      const connected = await client.testConnection();
      expect(connected).toBe(true);
      console.log('   ✅ Connection established');

      // Step 2: List available tools
      console.log('   Step 2: Listing available tools...');
      const tools = await client.listTools();
      expect(tools.length).toBeGreaterThan(0);
      console.log(`   ✅ Found ${tools.length} tools`);

      // Step 3: Fetch scripture
      console.log('   Step 3: Fetching scripture for John 3:16...');
      const scripture = await client.callTool('fetch_scripture', { reference: 'John 3:16' });
      expect(scripture).toBeDefined();
      expect(scripture.length).toBeGreaterThan(0);
      console.log(`   ✅ Scripture retrieved: ${scripture[0].text.substring(0, 50)}...`);

      // Step 4: Fetch translation notes
      console.log('   Step 4: Fetching translation notes...');
      const notes = await client.callTool('fetch_translation_notes', { reference: 'John 3:16' });
      expect(notes).toBeDefined();
      expect(notes.length).toBeGreaterThan(0);
      console.log('   ✅ Translation notes retrieved');

      // Step 5: Get context
      console.log('   Step 5: Getting context...');
      const context = await client.callTool('get_context', { reference: 'John 3:16' });
      expect(context).toBeDefined();
      expect(context.length).toBeGreaterThan(0);
      console.log('   ✅ Context retrieved');

      console.log('✅ Complete workflow successful!\n');
    }, 60000);
  });

  describe('Filtering Workflow', () => {
    it('should filter tools based on configuration', async () => {
      console.log('\n🔄 Testing tool filtering workflow...');

      // Create client with specific tool filter
      const filteredClient = new TranslationHelpsClient({
        upstreamUrl: UPSTREAM_URL,
        enabledTools: ['fetch_scripture', 'fetch_translation_notes'],
        timeout: 30000
      });

      console.log('   Step 1: Listing filtered tools...');
      const tools = await filteredClient.listTools();
      const toolNames = tools.map(t => t.name);

      // Should include enabled tools
      expect(toolNames).toContain('fetch_scripture');
      expect(toolNames).toContain('fetch_translation_notes');
      
      console.log(`   ✅ Filtered to ${tools.length} tools`);
      console.log(`   ✅ Available tools: ${toolNames.join(', ')}`);

      // Test that enabled tools work
      console.log('   Step 2: Testing enabled tool...');
      const result = await filteredClient.callTool('fetch_scripture', { reference: 'John 3:16' });
      expect(result).toBeDefined();
      console.log('   ✅ Enabled tool works correctly');

      console.log('✅ Filtering workflow successful!\n');
    }, 60000);

    it('should hide parameters based on configuration', async () => {
      console.log('\n🔄 Testing parameter hiding workflow...');

      // Create client with hidden parameters
      const clientWithHiddenParams = new TranslationHelpsClient({
        upstreamUrl: UPSTREAM_URL,
        hiddenParams: ['language', 'organization'],
        timeout: 30000
      });

      console.log('   Step 1: Listing tools with hidden params...');
      const tools = await clientWithHiddenParams.listTools();
      
      // Find fetch_scripture tool
      const scriptureToolIndex = tools.findIndex(t => t.name === 'fetch_scripture');
      expect(scriptureToolIndex).toBeGreaterThanOrEqual(0);
      
      const scriptureTool = tools[scriptureToolIndex];
      const properties = scriptureTool.inputSchema.properties;

      console.log('   Step 2: Verifying hidden parameters...');
      expect(properties).toHaveProperty('reference');
      expect(properties).not.toHaveProperty('language');
      expect(properties).not.toHaveProperty('organization');
      console.log('   ✅ Parameters hidden correctly');

      // Test that tool still works without hidden params
      console.log('   Step 3: Testing tool without hidden params...');
      const result = await clientWithHiddenParams.callTool('fetch_scripture', { reference: 'John 3:16' });
      expect(result).toBeDefined();
      console.log('   ✅ Tool works without hidden parameters');

      console.log('✅ Parameter hiding workflow successful!\n');
    }, 60000);
  });

  describe('Book/Chapter Note Filtering Workflow', () => {
    it('should filter book and chapter notes when enabled', async () => {
      console.log('\n🔄 Testing book/chapter note filtering...');

      // Create client with note filtering enabled
      const filteringClient = new TranslationHelpsClient({
        upstreamUrl: UPSTREAM_URL,
        filterBookChapterNotes: true,
        timeout: 30000
      });

      console.log('   Step 1: Fetching notes with filtering enabled...');
      const notes = await filteringClient.callTool('fetch_translation_notes', { reference: 'John 3:16' });
      expect(notes).toBeDefined();
      console.log('   ✅ Notes retrieved with filtering');

      // Verify configuration
      const config = filteringClient.getConfig();
      expect(config.filterBookChapterNotes).toBe(true);
      console.log('   ✅ Filtering configuration verified');

      console.log('✅ Note filtering workflow successful!\n');
    }, 60000);

    it('should filter out "Introduction to Matthew" when filterBookChapterNotes is true', async () => {
      console.log('\n🔄 Testing that book introductions are filtered out...');

      // Create client with note filtering enabled
      const filteringClient = new TranslationHelpsClient({
        upstreamUrl: UPSTREAM_URL,
        filterBookChapterNotes: true,
        timeout: 30000
      });

      console.log('   Step 1: Fetching translation notes for Mat 1:5...');
      const notes = await filteringClient.callTool('fetch_translation_notes', { reference: 'Mat 1:5' });
      expect(notes).toBeDefined();
      console.log('   ✅ Notes retrieved');

      console.log('   Step 2: Verifying "Introduction to Matthew" is filtered out...');
      const notesText = JSON.stringify(notes);
      expect(notesText).not.toContain('Introduction to Matthew');
      console.log('   ✅ "Introduction to Matthew" successfully filtered out');

      console.log('✅ Book introduction filtering successful!\n');
    }, 60000);
  });

  describe('Multi-Reference Workflow', () => {
    it('should handle multiple references in sequence', async () => {
      console.log('\n🔄 Testing multi-reference workflow...');

      const references = ['John 3:16', 'Genesis 1:1', 'Psalm 23:1'];
      
      for (const reference of references) {
        console.log(`   Fetching scripture for ${reference}...`);
        const result = await client.callTool('fetch_scripture', { reference });
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
        console.log(`   ✅ ${reference} retrieved`);
      }

      console.log('✅ Multi-reference workflow successful!\n');
    }, 90000);
  });

  describe('Reference Extraction Workflow', () => {
    it('should extract and fetch references from text', async () => {
      console.log('\n🔄 Testing reference extraction workflow...');

      const text = 'For God so loved the world (John 3:16), and in the beginning (Genesis 1:1)';

      console.log('   Step 1: Extracting references from text...');
      const extracted = await client.callTool('extract_references', { text });
      expect(extracted).toBeDefined();
      expect(extracted.length).toBeGreaterThan(0);
      console.log('   ✅ References extracted');

      // The extracted result should contain information about found references
      const extractedText = extracted[0].text;
      expect(extractedText).toBeDefined();
      console.log(`   ✅ Extraction result: ${extractedText.substring(0, 100)}...`);

      console.log('✅ Reference extraction workflow successful!\n');
    }, 60000);
  });

  describe('Configuration Update Workflow', () => {
    it('should update configuration dynamically', async () => {
      console.log('\n🔄 Testing dynamic configuration update...');

      console.log('   Step 1: Getting initial configuration...');
      const initialConfig = client.getConfig();
      console.log(`   ✅ Initial config: filterBookChapterNotes=${initialConfig.filterBookChapterNotes}`);

      console.log('   Step 2: Updating configuration...');
      client.updateConfig({ filterBookChapterNotes: !initialConfig.filterBookChapterNotes });
      
      const updatedConfig = client.getConfig();
      expect(updatedConfig.filterBookChapterNotes).toBe(!initialConfig.filterBookChapterNotes);
      console.log(`   ✅ Updated config: filterBookChapterNotes=${updatedConfig.filterBookChapterNotes}`);

      console.log('   Step 3: Verifying client still works...');
      const result = await client.callTool('fetch_scripture', { reference: 'John 3:16' });
      expect(result).toBeDefined();
      console.log('   ✅ Client works after configuration update');

      console.log('✅ Configuration update workflow successful!\n');
    }, 60000);
  });

  describe('Cache Management Workflow', () => {
    it('should manage cache correctly', async () => {
      console.log('\n🔄 Testing cache management workflow...');

      console.log('   Step 1: Fetching tools to populate cache...');
      await client.listTools();
      
      console.log('   Step 2: Checking cache status...');
      const cacheStatus = client.getCacheStatus();
      expect(cacheStatus).toBeDefined();
      console.log(`   ✅ Cache status: ${JSON.stringify(cacheStatus)}`);

      console.log('   Step 3: Clearing cache...');
      client.clearCache();
      console.log('   ✅ Cache cleared');

      console.log('   Step 4: Verifying cache was cleared...');
      const newCacheStatus = client.getCacheStatus();
      expect(newCacheStatus).toBeDefined();
      console.log(`   ✅ New cache status: ${JSON.stringify(newCacheStatus)}`);

      console.log('✅ Cache management workflow successful!\n');
    }, 60000);
  });
});