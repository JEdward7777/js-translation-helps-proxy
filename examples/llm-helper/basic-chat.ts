/**
 * Basic Chat Example
 * Demonstrates simple chat with LLM Helper using OpenAI-compatible interface
 */

import { LLMHelper } from '../../src/llm-helper/index.js';

async function main() {
  // Create LLM Helper instance (drop-in replacement for OpenAI client)
  const helper = new LLMHelper({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  console.log('LLM Helper initialized');
  console.log('Using OpenAI-compatible interface');
  console.log();

  // Simple chat using OpenAI-compatible API
  console.log('Sending chat request...');
  const response = await helper.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful Bible study assistant.',
      },
      {
        role: 'user',
        content: 'Hello! Can you help me study the Bible?',
      },
    ],
  });

  console.log('Response:', response.choices[0].message.content);
  console.log('Tokens used:', response.usage?.total_tokens);
}

main().catch(console.error);