/**
 * Multi-Turn Conversation Example
 * Demonstrates maintaining conversation context across multiple turns
 */

import { LLMHelper, ChatMessage } from '../../src/llm-helper/index.js';

async function main() {
  // Create LLM Helper instance
  const helper = new LLMHelper({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o-mini',
  });

  console.log('Multi-Turn Conversation Example');
  console.log('================================');
  console.log();

  // Initialize conversation with system message
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a Bible study assistant. Use the available tools to help users study scripture.',
    },
  ];

  // Turn 1: Ask about a verse
  console.log('Turn 1: User asks about John 3:16');
  messages.push({
    role: 'user',
    content: 'What does John 3:16 say?',
  });

  let response = await helper.chat(messages);
  messages.push(response.message);

  console.log('Assistant:', response.message.content);
  console.log();

  // Turn 2: Ask for translation notes
  console.log('Turn 2: User asks for translation notes');
  messages.push({
    role: 'user',
    content: 'What are the translation notes for this verse?',
  });

  response = await helper.chat(messages);
  messages.push(response.message);

  console.log('Assistant:', response.message.content);
  console.log();

  // Turn 3: Ask about a specific word
  console.log('Turn 3: User asks about a specific word');
  messages.push({
    role: 'user',
    content: 'What does "eternal life" mean in this context?',
  });

  response = await helper.chat(messages);
  messages.push(response.message);

  console.log('Assistant:', response.message.content);
  console.log();

  // Summary
  console.log('=== Conversation Summary ===');
  console.log(`Total messages: ${messages.length}`);
  console.log(`Total tokens used: ${response.usage?.totalTokens || 'N/A'}`);
}

main().catch(console.error);