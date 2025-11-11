/**
 * Basic Chat Example
 * Demonstrates simple chat with LLM Helper
 */

import { LLMHelper } from '../../src/llm-helper/index.js';

async function main() {
  // Create LLM Helper instance
  const helper = new LLMHelper({
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4',
    language: 'en',
    organization: 'unfoldingWord',
  });

  console.log('LLM Helper initialized');
  console.log(`Provider: ${helper.getProvider()}`);
  console.log(`Model: ${helper.getModel()}`);
  console.log();

  // Simple chat
  console.log('Sending chat request...');
  const response = await helper.chat([
    {
      role: 'system',
      content: 'You are a helpful Bible study assistant.',
    },
    {
      role: 'user',
      content: 'Hello! Can you help me study the Bible?',
    },
  ]);

  console.log('Response:', response.message.content);
  console.log('Finish reason:', response.finishReason);
  console.log('Tokens used:', response.usage?.totalTokens);
}

main().catch(console.error);