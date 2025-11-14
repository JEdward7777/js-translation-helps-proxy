/**
 * Integration tests for calling tools on the upstream server
 * These tests make real API calls to verify tool functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { UpstreamClient } from '../../src/core/upstream-client.js';
import { TranslationHelpsClient } from '../../src/core/index.js';

// Get upstream URL from environment or use default
const UPSTREAM_URL = process.env.UPSTREAM_MCP_URL || 'https://translation-helps-mcp.pages.dev/api/mcp';

describe('Tool Calling (Integration)', () => {
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

  describe('fetch_scripture', () => {
    it('should fetch scripture for John 3:16', async () => {
      const result = await upstreamClient.callTool('fetch_scripture', {
        reference: 'John 3:16'
      });

      // UpstreamClient now returns raw response objects
      expect(result).toBeDefined();
      expect(result).toHaveProperty('scripture');
      expect(Array.isArray((result as any).scripture)).toBe(true);
      expect((result as any).scripture.length).toBeGreaterThan(0);

      console.log('✅ fetch_scripture returned raw response with scripture array');
    }, 30000);

    it('should fetch scripture with language parameter', async () => {
      const result = await upstreamClient.callTool('fetch_scripture', {
        reference: 'Genesis 1:1',
        language: 'en'
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('scripture');
      
      console.log('✅ fetch_scripture with language returned data');
    }, 30000);
  });

  describe('fetch_translation_notes', () => {
    it('should fetch translation notes for John 3:16', async () => {
      const result = await upstreamClient.callTool('fetch_translation_notes', {
        reference: 'John 3:16'
      });

      // UpstreamClient now returns raw response objects
      expect(result).toBeDefined();
      expect(result).toHaveProperty('items');
      expect(Array.isArray((result as any).items)).toBe(true);

      console.log('✅ fetch_translation_notes returned raw response with items array');
    }, 30000);

    it('should handle references with no notes gracefully', async () => {
      const result = await upstreamClient.callTool('fetch_translation_notes', {
        reference: 'Genesis 1:1'
      });

      expect(result).toBeDefined();
      
      console.log('✅ fetch_translation_notes handled edge case');
    }, 30000);
  });

  describe('fetch_translation_questions', () => {
    it('should fetch translation questions', async () => {
      const result = await upstreamClient.callTool('fetch_translation_questions', {
        reference: 'John 3:16'
      });

      // UpstreamClient now returns raw response objects
      expect(result).toBeDefined();
      expect(result).toHaveProperty('items');

      console.log('✅ fetch_translation_questions returned raw response');
    }, 30000);
  });

  describe('get_translation_word', () => {
    it('should fetch translation words for a reference', async () => {
      const result = await upstreamClient.callTool('get_translation_word', {
        reference: 'John 3:16'
      });

      // UpstreamClient now returns raw response objects
      expect(result).toBeDefined();
      expect(result).toHaveProperty('items');

      console.log('✅ get_translation_word returned raw response');
    }, 30000);
  });

  describe('browse_translation_words', () => {
    it.skip('should browse translation words', async () => {
      // Skipping because upstream returns 500 error for this endpoint
      const result = await upstreamClient.callTool('browse_translation_words', {
        language: 'en'
      });

      expect(result).toBeDefined();

      console.log('✅ browse_translation_words returned word list');
    }, 30000);

    it.skip('should browse with search parameter', async () => {
      // Skipping because upstream returns 500 error for this endpoint
      const result = await upstreamClient.callTool('browse_translation_words', {
        language: 'en',
        search: 'love'
      });

      expect(result).toBeDefined();

      console.log('✅ browse_translation_words with search returned results');
    }, 30000);
  });

  describe('get_context', () => {
    it('should get context for a reference', async () => {
      const result = await upstreamClient.callTool('get_context', {
        reference: 'John 3:16'
      });

      // UpstreamClient now returns raw response objects
      expect(result).toBeDefined();
      expect(result).toHaveProperty('reference');

      console.log('✅ get_context returned raw context response');
    }, 30000);
  });

  describe('extract_references', () => {
    it('should extract references from text', async () => {
      const result = await upstreamClient.callTool('extract_references', {
        text: 'See John 3:16 and Genesis 1:1 for more information'
      });

      // UpstreamClient now returns raw response objects
      expect(result).toBeDefined();

      console.log('✅ extract_references returned raw response');
    }, 30000);
  });

  describe('TranslationHelpsClient Tool Methods', () => {
    it('should call fetchScripture', async () => {
      const result = await translationHelpsClient.fetchScripture({
        reference: 'John 3:16'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      console.log('✅ TranslationHelpsClient.fetchScripture works');
    }, 30000);

    it('should call fetchTranslationNotes', async () => {
      const result = await translationHelpsClient.fetchTranslationNotes({
        reference: 'John 3:16'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      console.log('✅ TranslationHelpsClient.fetchTranslationNotes works');
    }, 30000);

    it('should call getContext', async () => {
      const result = await translationHelpsClient.getContext({
        reference: 'John 3:16'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      console.log('✅ TranslationHelpsClient.getContext works');
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid references gracefully', async () => {
      try {
        const result = await upstreamClient.callTool('fetch_scripture', {
          reference: 'InvalidBook 999:999'
        });
        
        // Should either return an error message or throw
        expect(result).toBeDefined();
        console.log('✅ Invalid reference handled gracefully');
      } catch (error) {
        // Error is also acceptable
        expect(error).toBeDefined();
        console.log('✅ Invalid reference threw expected error');
      }
    }, 30000);

    it('should handle missing required parameters', async () => {
      try {
        await upstreamClient.callTool('fetch_scripture', {});
        // If it doesn't throw, that's also valid (server might have defaults)
        console.log('✅ Missing parameters handled by server defaults');
      } catch (error) {
        // Error is expected
        expect(error).toBeDefined();
        console.log('✅ Missing parameters threw expected error');
      }
    }, 30000);
  });
});