/**
 * Chat with Automatic Tool Execution Example
 * Demonstrates LLM Helper with automatic tool calling
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
    maxToolIterations: 5,
  });

  console.log('LLM Helper initialized with automatic tool execution');
  console.log();

  // Get available tools
  const tools = await helper.getAvailableTools();
  console.log(`Available tools: ${tools.length}`);
  console.log('Tools:', tools.map(t => t.name).join(', '));
  console.log();

  // Chat with automatic tool execution
  console.log('Sending request that will trigger tool calls...');
  console.log('User: "What does John 3:16 say and what are the translation notes?"');
  console.log();

  const response = await helper.chat(
    [
      {
        role: 'system',
        content: 'You are a Bible study assistant. Use the available tools to fetch scripture and translation helps.',
      },
      {
        role: 'user',
        content: 'What does John 3:16 say and what are the translation notes for it?',
      },
    ],
    {
      maxIterations: 5,
      onToolCall: (toolCall) => {
        console.log(`🔧 Calling tool: ${toolCall.name}`);
        console.log(`   Arguments:`, JSON.stringify(toolCall.arguments, null, 2));
      },
      onToolResult: (result) => {
        console.log(`✅ Tool result: ${result.name}`);
        console.log(`   Content preview: ${result.content.substring(0, 100)}...`);
        if (result.isError) {
          console.log(`   ⚠️  Error: ${result.content}`);
        }
      },
      onIteration: (iteration, max) => {
        console.log(`📍 Iteration ${iteration}/${max}`);
      },
    }
  );

  console.log();
  console.log('=== Final Response ===');
  console.log(response.message.content);
  console.log();
  console.log('Finish reason:', response.finishReason);
  console.log('Tokens used:', response.usage?.totalTokens);
}

main().catch(console.error);