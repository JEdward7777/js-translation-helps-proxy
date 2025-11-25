#!/usr/bin/env node
/**
 * Script to fetch real responses from the upstream Translation Helps API
 * and save them as reference files for testing and validation.
 *
 * This script dynamically discovers all available tools from upstream and
 * generates appropriate test parameters based on the tool's input schema.
 *
 * Usage: npx tsx scripts/fetch-upstream-responses.ts
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const UPSTREAM_URL = 'https://translation-helps-mcp.pages.dev';

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Mapping of parameter names to test values
 * Add new mappings here as needed for new parameters
 */
const PARAM_VALUE_MAP: Record<string, any> = {
  reference: 'John 3:16',
  language: 'en',
  organization: 'unfoldingWord',
  wordId: 'believe',
  limit: 10,
  text: 'See John 3:16 and Romans 8:28',
  includeContext: true,
  query: 'love',
  category: 'kt',
  search: 'believe',
  includeImplementationDetails: false
};

/**
 * Fetch available tools from upstream via MCP protocol
 */
async function fetchToolsList(): Promise<Tool[]> {
  const url = `${UPSTREAM_URL}/api/mcp`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list',
      params: {}
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const mcpResponse = await response.json();
  
  if (mcpResponse.error) {
    throw new Error(`MCP Error: ${mcpResponse.error.message}`);
  }
  
  // Handle different response formats
  // Direct tools array: {"tools": [...]}
  if (Array.isArray(mcpResponse.tools)) {
    return mcpResponse.tools;
  }
  
  // Nested in result: {"result": {"tools": [...]}}
  if (mcpResponse.result) {
    if (Array.isArray(mcpResponse.result.tools)) {
      return mcpResponse.result.tools;
    } else if (Array.isArray(mcpResponse.result)) {
      return mcpResponse.result;
    }
  }
  
  throw new Error(`Unexpected response format: ${JSON.stringify(mcpResponse)}`);
}

/**
 * Generate test parameters for a tool based on its input schema
 * Throws an error if a required parameter doesn't have a mapping
 */
function generateTestParams(tool: Tool): Record<string, any> {
  const params: Record<string, any> = {};
  const unmappedParams: string[] = [];
  
  // Get all required parameters
  const requiredParams = tool.inputSchema.required || [];
  
  // Map required parameters
  for (const paramName of requiredParams) {
    if (paramName in PARAM_VALUE_MAP) {
      params[paramName] = PARAM_VALUE_MAP[paramName];
    } else {
      unmappedParams.push(paramName);
    }
  }
  
  // Check for unmapped required parameters
  if (unmappedParams.length > 0) {
    throw new Error(
      `Tool '${tool.name}' has required parameters without mappings: ${unmappedParams.join(', ')}\n` +
      `Please add mappings for these parameters in PARAM_VALUE_MAP`
    );
  }
  
  // Add optional parameters that have mappings
  const allParams = Object.keys(tool.inputSchema.properties || {});
  for (const paramName of allParams) {
    if (!requiredParams.includes(paramName) && paramName in PARAM_VALUE_MAP) {
      params[paramName] = PARAM_VALUE_MAP[paramName];
    }
  }
  
  return params;
}

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
  
  // Return the result, or the whole response if no result field
  if (mcpResponse.result !== undefined) {
    return mcpResponse.result;
  }
  
  return mcpResponse;
}

async function fetchResponse(toolName: string, params: Record<string, any>): Promise<any> {
  console.log(`Fetching ${toolName}...`);
  console.log(`  Params: ${JSON.stringify(params)}`);
  console.log(`  Via MCP: ${UPSTREAM_URL}/api/mcp`);
  
  try {
    const data = await fetchViaMCP(toolName, params);
    const dataStr = JSON.stringify(data);
    console.log(`  ✓ Success (${dataStr.length} bytes)`);
    return data;
  } catch (error) {
    console.error(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function main() {
  console.log('Fetching upstream responses...\n');
  console.log('Step 1: Discovering available tools from upstream...\n');

  // Fetch available tools from upstream
  let tools: Tool[];
  try {
    tools = await fetchToolsList();
    console.log(`✓ Discovered ${tools.length} tools from upstream\n`);
    console.log('Available tools:');
    tools.forEach(tool => {
      const requiredParams = tool.inputSchema.required || [];
      console.log(`  - ${tool.name} (requires: ${requiredParams.join(', ') || 'none'})`);
    });
    console.log('');
  } catch (error) {
    console.error('✗ Failed to fetch tools list:', error);
    process.exit(1);
  }

  console.log('Step 2: Generating test parameters for each tool...\n');

  // Generate test cases for each tool
  const testCases: Array<{ tool: string; params: Record<string, any> }> = [];
  const paramGenerationErrors: Array<{ tool: string; error: string }> = [];

  for (const tool of tools) {
    try {
      const params = generateTestParams(tool);
      testCases.push({ tool: tool.name, params });
      console.log(`✓ ${tool.name}: ${Object.keys(params).length} parameters`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      paramGenerationErrors.push({ tool: tool.name, error: errorMsg });
      console.error(`✗ ${tool.name}: ${errorMsg}`);
    }
  }
  console.log('');

  // Exit if there are parameter generation errors
  if (paramGenerationErrors.length > 0) {
    console.error('Cannot proceed: Some tools have unmapped required parameters.\n');
    console.error('Please update PARAM_VALUE_MAP in this script with appropriate test values.\n');
    process.exit(1);
  }

  console.log('Step 3: Fetching responses from upstream...\n');

  // Create output directory
  const outputDir = join(process.cwd(), 'test-data', 'upstream-responses');
  mkdirSync(outputDir, { recursive: true });
  console.log(`Output directory: ${outputDir}\n`);

  const results: Array<{ tool: string; success: boolean; error?: string }> = [];

  // Fetch each test case
  for (const testCase of testCases) {
    try {
      const response = await fetchResponse(testCase.tool, testCase.params);
      
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

**Note**: This directory is automatically generated by running \`npx tsx scripts/fetch-upstream-responses.ts\`.
The script dynamically discovers all available tools from upstream and generates appropriate test parameters.

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

The script will:
1. Dynamically discover all available tools from upstream
2. Generate appropriate test parameters based on tool schemas
3. Fetch responses for each tool
4. Save responses as JSON files

## Parameter Mapping

Test parameters are automatically generated using the mapping defined in \`PARAM_VALUE_MAP\`:
${Object.entries(PARAM_VALUE_MAP).map(([key, value]) => `- \`${key}\`: \`${JSON.stringify(value)}\``).join('\n')}

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

## Tool Schemas

Total tools discovered: ${tools.length}

${tools.map(tool => {
  const required = tool.inputSchema.required || [];
  const optional = Object.keys(tool.inputSchema.properties || {}).filter(p => !required.includes(p));
  return `### ${tool.name}

${tool.description}

**Required parameters**: ${required.length > 0 ? required.join(', ') : 'none'}
**Optional parameters**: ${optional.length > 0 ? optional.join(', ') : 'none'}`;
}).join('\n\n')}
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