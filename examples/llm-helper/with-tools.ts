/**
 * Chat with Automatic Tool Execution Example
 * Demonstrates LLM Helper with automatic tool calling
 */

import { LLMHelper } from '../../src/llm-helper/index.js';

async function main() {
  // Create LLM Helper instance (drop-in replacement for OpenAI client)
  const helper = new LLMHelper({
    apiKey: process.env.OPENAI_API_KEY!,
    maxToolIterations: 5,
  });

  console.log('LLM Helper initialized with automatic tool execution');
  console.log();

  // Get Translation Helps client for direct access
  const client = helper.getClient();
  const tools = await client.listTools();
  console.log(`Available tools: ${tools.length}`);
  console.log('Tools:', tools.map(t => t.name).join(', '));
  console.log();

  // Chat with automatic tool execution using OpenAI-compatible API
  console.log('Sending request that will trigger tool calls...');
  console.log('User: "What does John 3:16 say and what are the translation notes?"');
  console.log();

  const response = await helper.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a Bible study assistant. Use the available tools to fetch scripture and translation helps.',
      },
      {
        role: 'user',
        content: 'What does John 3:16 say and what are the translation notes for it?',
      },
    ],
  });

  console.log();
  console.log('=== Final Response ===');
  console.log(response.choices[0].message.content);
  console.log();
  console.log('Tokens used:', response.usage?.total_tokens);
}

main().catch(console.error);