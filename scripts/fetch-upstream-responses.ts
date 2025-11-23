#!/usr/bin/env node
/**
 * Script to fetch real responses from the upstream Translation Helps API
 * and save them as reference files for testing and validation.
 * 
 * Usage: npx tsx scripts/fetch-upstream-responses.ts
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const UPSTREAM_URL = 'https://translation-helps-mcp.pages.dev';

interface TestCase {
  tool: string;
  params: Record<string, any>;
}

const testCases: TestCase[] = [
  {
    tool: 'fetch_scripture',
    params: {
      reference: 'John 3:16',
      language: 'en',
      organization: 'unfoldingWord'
    }
  },
  {
    tool: 'fetch_translation_notes',
    params: {
      reference: 'John 3:16',
      language: 'en',
      organization: 'unfoldingWord'
    }
  },
  {
    tool: 'fetch_translation_questions',
    params: {
      reference: 'John 3:16',
      language: 'en',
      organization: 'unfoldingWord'
    }
  },
  {
    tool: 'get_translation_word',
    params: {
      reference: 'John 3:16',
      wordId: 'believe',
      language: 'en',
      organization: 'unfoldingWord'
    }
  },
  {
    tool: 'browse_translation_words',
    params: {
      language: 'en',
      organization: 'unfoldingWord',
      limit: 10
    }
  },
  {
    tool: 'get_context',
    params: {
      reference: 'John 3:16',
      language: 'en',
      organization: 'unfoldingWord'
    }
  },
  {
    tool: 'extract_references',
    params: {
      text: 'See John 3:16 and Romans 8:28',
      includeContext: true
    }
  }
];

/**
 * Fetch tool response via MCP protocol
 * Upstream is fully MCP-compliant as of v6.6.3
 */
async function fetchViaMCP(tool: string, params: Record<string, any>): Promise<any> {
  const url = `${UPSTREAM_URL}/api/mcp`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: tool,
        arguments: params
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const mcpResponse = await response.json();
  
  // Extract the actual data from MCP response
  if (mcpResponse.error) {
    throw new Error(`MCP Error: ${mcpResponse.error.message}`);
  }
  
  return mcpResponse.result;
}

async function fetchResponse(testCase: TestCase): Promise<any> {
  console.log(`Fetching ${testCase.tool}...`);
  console.log(`  Via MCP: ${UPSTREAM_URL}/api/mcp`);
  
  try {
    const data = await fetchViaMCP(testCase.tool, testCase.params);
    console.log(`  ✓ Success (${JSON.stringify(data).length} bytes)`);
    return data;
  } catch (error) {
    console.error(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function main() {
  console.log('Fetching upstream responses...\n');

  // Create output directory
  const outputDir = join(process.cwd(), 'test-data', 'upstream-responses');
  mkdirSync(outputDir, { recursive: true });
  console.log(`Output directory: ${outputDir}\n`);

  const results: Array<{ tool: string; success: boolean; error?: string }> = [];

  // Fetch each test case
  for (const testCase of testCases) {
    try {
      const response = await fetchResponse(testCase);
      
      // Save to file
      const outputFile = join(outputDir, `${testCase.tool}.json`);
      const output = {
        tool: testCase.tool,
        timestamp: new Date().toISOString(),
        request: testCase.params,
        response: response
      };
      
      writeFileSync(outputFile, JSON.stringify(output, null, 2));
      console.log(`  Saved to: ${testCase.tool}.json\n`);
      
      results.push({ tool: testCase.tool, success: true });
    } catch (error) {
      results.push({
        tool: testCase.tool,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('');
    }
  }

  // Create README
  const readmeContent = `# Upstream Response Reference Files

This directory contains real responses from the upstream Translation Helps API, captured for testing and validation purposes.

## Files

${testCases.map(tc => `- \`${tc.tool}.json\` - Response for ${tc.tool}`).join('\n')}

## Purpose

These files serve as:
1. **Ground truth** for actual upstream response formats
2. **Test fixtures** for unit and integration tests
3. **Documentation** of API behavior
4. **Change detection** - can diff when upstream API updates

## Updating

To refresh these files with current upstream responses:

\`\`\`bash
npx tsx scripts/fetch-upstream-responses.ts
\`\`\`

## File Format

Each file contains:
- \`tool\` - The tool name
- \`timestamp\` - When the response was captured
- \`request\` - The parameters used
- \`response\` - The actual upstream response

## Last Updated

${new Date().toISOString()}

## Results

${results.map(r => `- ${r.success ? '✓' : '✗'} ${r.tool}${r.error ? ` - ${r.error}` : ''}`).join('\n')}
`;

  writeFileSync(join(outputDir, 'README.md'), readmeContent);
  console.log('Created README.md\n');

  // Summary
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${results.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  
  if (failCount > 0) {
    console.log('\nFailed tools:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.tool}: ${r.error}`);
    });
  }
  
  console.log('\nDone!');
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});