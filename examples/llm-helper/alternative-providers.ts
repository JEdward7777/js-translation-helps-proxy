/**
 * Example: Using LLMHelper with Alternative OpenAI-Compatible Providers
 * 
 * This example demonstrates how to use the baseURL parameter to connect
 * to alternative LLM providers like Grok, Azure OpenAI, or local models.
 */

import { LLMHelper } from '../../src/llm-helper/index.js';

async function main() {
  console.log('=== Alternative LLM Providers Example ===\n');

  // Example 1: Using Grok (xAI)
  console.log('1. Using Grok API:');
  const grokHelper = new LLMHelper({
    apiKey: process.env.XAI_API_KEY || 'xai-...',
    baseURL: 'https://api.x.ai/v1',
    enabledTools: ['fetch_scripture', 'fetch_translation_notes'],
  });

  try {
    const grokResponse = await grokHelper.chat.completions.create({
      model: 'grok-beta',
      messages: [
        { role: 'system', content: 'You are a Bible study assistant.' },
        { role: 'user', content: 'What does John 3:16 say?' }
      ],
      temperature: 0.7,
    });

    console.log('Grok Response:', grokResponse.choices[0].message.content);
    console.log('Tokens used:', grokResponse.usage?.total_tokens);
  } catch (error) {
    console.error('Grok error:', error instanceof Error ? error.message : error);
  }

  console.log('\n---\n');

  // Example 2: Using Local LLM Server (e.g., LM Studio, Ollama)
  console.log('2. Using Local LLM Server:');
  const localHelper = new LLMHelper({
    apiKey: 'local', // Many local servers don't validate the key
    baseURL: 'http://localhost:1234/v1',
    enabledTools: ['fetch_scripture'],
  });

  try {
    const localResponse = await localHelper.chat.completions.create({
      model: 'local-model', // Use your local model name
      messages: [
        { role: 'system', content: 'You are a Bible study assistant.' },
        { role: 'user', content: 'What does John 3:16 say?' }
      ],
      temperature: 0.7,
    });

    console.log('Local LLM Response:', localResponse.choices[0].message.content);
    console.log('Tokens used:', localResponse.usage?.total_tokens);
  } catch (error) {
    console.error('Local LLM error:', error instanceof Error ? error.message : error);
  }

  console.log('\n---\n');

  // Example 3: Using Azure OpenAI
  console.log('3. Using Azure OpenAI:');
  const azureHelper = new LLMHelper({
    apiKey: process.env.AZURE_OPENAI_API_KEY || 'azure-key',
    baseURL: process.env.AZURE_OPENAI_ENDPOINT || 'https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT',
    enabledTools: ['fetch_scripture', 'fetch_translation_notes'],
  });

  try {
    const azureResponse = await azureHelper.chat.completions.create({
      model: 'gpt-4o-mini', // Your Azure deployment name
      messages: [
        { role: 'system', content: 'You are a Bible study assistant.' },
        { role: 'user', content: 'What does John 3:16 say?' }
      ],
      temperature: 0.7,
    });

    console.log('Azure OpenAI Response:', azureResponse.choices[0].message.content);
    console.log('Tokens used:', azureResponse.usage?.total_tokens);
  } catch (error) {
    console.error('Azure OpenAI error:', error instanceof Error ? error.message : error);
  }

  console.log('\n---\n');

  // Example 4: Default OpenAI (no baseURL specified)
  console.log('4. Using Default OpenAI:');
  const openaiHelper = new LLMHelper({
    apiKey: process.env.OPENAI_API_KEY || 'sk-...',
    // No baseURL specified - uses default OpenAI endpoint
    enabledTools: ['fetch_scripture', 'fetch_translation_notes'],
  });

  try {
    const openaiResponse = await openaiHelper.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a Bible study assistant.' },
        { role: 'user', content: 'What does John 3:16 say?' }
      ],
      temperature: 0.7,
    });

    console.log('OpenAI Response:', openaiResponse.choices[0].message.content);
    console.log('Tokens used:', openaiResponse.usage?.total_tokens);
  } catch (error) {
    console.error('OpenAI error:', error instanceof Error ? error.message : error);
  }

  console.log('\n=== Example Complete ===');
}

// Run the example
main().catch(console.error);