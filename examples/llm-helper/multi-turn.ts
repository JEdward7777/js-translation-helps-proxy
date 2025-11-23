/**
 * Multi-Turn Conversation Example
 * Demonstrates maintaining conversation context across multiple turns
 */

import { LLMHelper } from '../../src/llm-helper/index.js';
import OpenAI from 'openai';

async function main() {
  // Create LLM Helper instance (drop-in replacement for OpenAI client)
  const helper = new LLMHelper({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  console.log('Multi-Turn Conversation Example');
  console.log('================================');
  console.log();

  // Initialize conversation with system message
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
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

  let response = await helper.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
  });
  messages.push(response.choices[0].message);

  console.log('Assistant:', response.choices[0].message.content);
  console.log();

  // Turn 2: Ask for translation notes
  console.log('Turn 2: User asks for translation notes');
  messages.push({
    role: 'user',
    content: 'What are the translation notes for this verse?',
  });

  response = await helper.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
  });
  messages.push(response.choices[0].message);

  console.log('Assistant:', response.choices[0].message.content);
  console.log();

  // Turn 3: Ask about a specific word
  console.log('Turn 3: User asks about a specific word');
  messages.push({
    role: 'user',
    content: 'What does "eternal life" mean in this context?',
  });

  response = await helper.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
  });
  messages.push(response.choices[0].message);

  console.log('Assistant:', response.choices[0].message.content);
  console.log();

  // Summary
  console.log('=== Conversation Summary ===');
  console.log(`Total messages: ${messages.length}`);
  console.log(`Total tokens used: ${response.usage?.total_tokens || 'N/A'}`);
}

main().catch(console.error);