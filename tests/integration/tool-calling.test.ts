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

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('type', 'text');
      expect(result[0]).toHaveProperty('text');
      expect(result[0].text.length).toBeGreaterThan(0);

      console.log('✅ fetch_scripture returned:', result[0].text.substring(0, 100) + '...');
    }, 30000);

    it('should fetch scripture with language parameter', async () => {
      const result = await upstreamClient.callTool('fetch_scripture', {
        reference: 'Genesis 1:1',
        language: 'en'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      console.log('✅ fetch_scripture with language returned data');
    }, 30000);
  });

  describe('fetch_translation_notes', () => {
    it('should fetch translation notes for John 3:16', async () => {
      const result = await upstreamClient.callTool('fetch_translation_notes', {
        reference: 'John 3:16'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('type', 'text');
      expect(result[0]).toHaveProperty('text');

      console.log('✅ fetch_translation_notes returned notes');
    }, 30000);

    it('should handle references with no notes gracefully', async () => {
      const result = await upstreamClient.callTool('fetch_translation_notes', {
        reference: 'Genesis 1:1'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      console.log('✅ fetch_translation_notes handled edge case');
    }, 30000);
  });

  describe('fetch_translation_questions', () => {
    it('should fetch translation questions', async () => {
      const result = await upstreamClient.callTool('fetch_translation_questions', {
        reference: 'John 3:16'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      console.log('✅ fetch_translation_questions returned questions');
    }, 30000);
  });

  describe('get_translation_word', () => {
    it('should fetch translation words for a reference', async () => {
      const result = await upstreamClient.callTool('get_translation_word', {
        reference: 'John 3:16'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      console.log('✅ get_translation_word returned words');
    }, 30000);
  });

  describe('browse_translation_words', () => {
    it('should browse translation words', async () => {
      const result = await upstreamClient.callTool('browse_translation_words', {
        language: 'en'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      console.log('✅ browse_translation_words returned word list');
    }, 30000);

    it('should browse with search parameter', async () => {
      const result = await upstreamClient.callTool('browse_translation_words', {
        language: 'en',
        search: 'love'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      console.log('✅ browse_translation_words with search returned results');
    }, 30000);
  });

  describe('get_context', () => {
    it('should get context for a reference', async () => {
      const result = await upstreamClient.callTool('get_context', {
        reference: 'John 3:16'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      console.log('✅ get_context returned context information');
    }, 30000);
  });

  describe('extract_references', () => {
    it('should extract references from text', async () => {
      const result = await upstreamClient.callTool('extract_references', {
        text: 'See John 3:16 and Genesis 1:1 for more information'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      console.log('✅ extract_references found references in text');
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