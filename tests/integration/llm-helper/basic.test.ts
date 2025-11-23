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
      });
    });

    it('should use OpenAI SDK via Interface 4', async () => {
      const response = await helper.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say hello' }],
      });

      expect(response.choices[0].message.role).toBe('assistant');
      expect(response.choices[0].message.content).toBeTruthy();
      expect(response.id).toBeTruthy();
      expect(response.object).toBe('chat.completion');
    }, 30000);

    it('should execute Translation Helps tools automatically', async () => {
      const response = await helper.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Fetch John 3:16' }],
      });

      expect(response.choices[0].message.content).toContain('God');
    }, 30000);

    it('should support n > 1 and return all choices', async () => {
      const response = await helper.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say hello' }],
        n: 2,
      });

      expect(response.choices).toHaveLength(2);
      expect(response.choices[0].message.content).toBeTruthy();
      expect(response.choices[1].message.content).toBeTruthy();
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
      });

      expect(helper).toBeDefined();
      expect(helper.chat).toBeDefined();
      expect(helper.chat.completions).toBeDefined();
      expect(helper.chat.completions.create).toBeDefined();
    });

    it('should throw error without API key', () => {
      expect(() => {
        new LLMHelper({
          apiKey: '',
        });
      }).toThrow('API key is required');
    });
  });
});