/**
 * Integration tests for LLM Helper
 * These tests require actual API keys to run
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { LLMHelper } from '../../../src/llm-helper/index.js';

describe('LLMHelper Integration Tests', () => {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  describe.skipIf(!hasOpenAIKey)('OpenAI Integration', () => {
    let helper: LLMHelper;

    beforeAll(() => {
      helper = new LLMHelper({
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY!,
        model: 'gpt-3.5-turbo',
        language: 'en',
        organization: 'unfoldingWord',
        maxToolIterations: 3,
      });
    });

    it('should get available tools', async () => {
      const tools = await helper.getAvailableTools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.some(t => t.name === 'fetch_scripture')).toBe(true);
    });

    it('should execute a tool manually', async () => {
      const result = await helper.executeTool('fetch_scripture', {
        reference: 'John 3:16',
      });
      
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe.skipIf(!hasAnthropicKey)('Anthropic Integration', () => {
    let helper: LLMHelper;

    beforeAll(() => {
      helper = new LLMHelper({
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: 'claude-3-haiku-20240307',
        language: 'en',
        organization: 'unfoldingWord',
        maxToolIterations: 3,
      });
    });

    it('should get available tools', async () => {
      const tools = await helper.getAvailableTools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.some(t => t.name === 'fetch_scripture')).toBe(true);
    });

    it('should execute a tool manually', async () => {
      const result = await helper.executeTool('fetch_scripture', {
        reference: 'John 3:16',
      });
      
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Configuration', () => {
    it('should create helper with minimal config', () => {
      const helper = new LLMHelper({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      expect(helper.getProvider()).toBe('openai');
      expect(helper.getModel()).toBe('gpt-4');
    });

    it('should update configuration', () => {
      const helper = new LLMHelper({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
        language: 'en',
      });

      helper.updateConfig({ language: 'es' });
      const config = helper.getConfig();
      expect(config.language).toBe('es');
    });
  });
});