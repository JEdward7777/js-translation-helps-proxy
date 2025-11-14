/**
 * Integration tests for LLM Helper
 * These tests require actual API keys to run
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { LLMHelper } from '../../../src/llm-helper/index.js';

describe('LLM Helper (Integration)', () => {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

  describe.skipIf(!hasOpenAIKey)('OpenAI Integration', () => {
    let helper: LLMHelper;

    beforeAll(() => {
      helper = new LLMHelper({
        apiKey: process.env.OPENAI_API_KEY!,
        model: 'gpt-4o-mini',
      });
    });

    it('should use OpenAI SDK via Interface 4', async () => {
      const response = await helper.chat([
        { role: 'user', content: 'Say hello' }
      ]);

      expect(response.message.role).toBe('assistant');
      expect(response.message.content).toBeTruthy();
    }, 30000);

    it('should execute Translation Helps tools automatically', async () => {
      const response = await helper.chat([
        { role: 'user', content: 'Fetch John 3:16' }
      ]);

      expect(response.message.content).toContain('God');
    }, 30000);

    it('should provide access to Translation Helps client', () => {
      const client = helper.getClient();
      expect(client).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should create helper with minimal config', () => {
      const helper = new LLMHelper({
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      expect(helper).toBeDefined();
    });

    it('should throw error without API key', () => {
      expect(() => {
        new LLMHelper({
          apiKey: '',
          model: 'gpt-4o-mini',
        });
      }).toThrow('API key is required');
    });

    it('should throw error without model', () => {
      expect(() => {
        new LLMHelper({
          apiKey: 'test-key',
          model: '',
        });
      }).toThrow('Model is required');
    });
  });
});