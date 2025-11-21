/**
 * End-to-end tests for MCP Streamable HTTP Transport
 * 
 * These tests validate full MCP Inspector compatibility by:
 * - Using the official @modelcontextprotocol/sdk Client
 * - Testing against the real StreamableHTTPServerTransport implementation
 * - Verifying JSON-RPC 2.0 protocol compliance
 * - Testing session management and SSE streaming
 * 
 * NO MOCKS - These are true end-to-end tests against production code
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { serve } from '@hono/node-server';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createUnifiedServer } from '../../src/openai-api/index.js';

describe('MCP Streamable HTTP Transport (E2E)', () => {
  let server: any;
  let serverPort: number;
  let client: Client;
  let transport: StreamableHTTPClientTransport;

  beforeAll(async () => {
    // Create the unified server with real production code
    const app = createUnifiedServer({
      logLevel: 'debug', // Enable debug logging to see what's happening
      mcp: {
        // Use default configuration - all tools enabled
      },
    });

    // Start server on random available port
    serverPort = 8787 + Math.floor(Math.random() * 1000);
    server = serve({
      fetch: app.fetch,
      port: serverPort,
    });

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create official MCP client with StreamableHTTP transport
    transport = new StreamableHTTPClientTransport(
      new URL(`http://localhost:${serverPort}/mcp`)
    );

    client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // Connect the client with timeout
    await client.connect(transport);
  }, 60000); // Increase timeout to 60 seconds

  afterAll(async () => {
    // Clean up
    if (client) {
      await client.close();
    }
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  describe('Connection and Initialization', () => {
    it('connects via official Streamable HTTP transport', () => {
      // Client should be connected after beforeAll
      expect(client).toBeDefined();
      expect(transport).toBeDefined();
    });

    it('initializes with correct server info', async () => {
      // The connection in beforeAll should have completed initialization
      // We can verify by listing tools (which requires successful init)
      const result = await client.listTools();
      expect(result).toBeDefined();
      expect(result.tools).toBeDefined();
    });
  });

  describe('Tool Discovery', () => {
    it('lists all translation tools', async () => {
      const result = await client.listTools();
      
      expect(result.tools).toBeDefined();
      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.tools.length).toBeGreaterThan(0);
      
      console.log(`   ✅ Discovered ${result.tools.length} tools via Streamable HTTP`);
    });

    it('includes expected core translation tools', async () => {
      const result = await client.listTools();
      const toolNames = result.tools.map(t => t.name);

      // Verify core tools are present
      const expectedTools = [
        'fetch_scripture',
        'fetch_translation_notes',
        'fetch_translation_questions',
        'get_translation_word',
        'get_context',
      ];

      for (const toolName of expectedTools) {
        expect(toolNames).toContain(toolName);
      }

      console.log(`   ✅ All expected core tools available: ${expectedTools.join(', ')}`);
    });

    it('returns tools with valid schemas', async () => {
      const result = await client.listTools();
      
      for (const tool of result.tools) {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      }

      console.log('   ✅ All tool schemas are valid');
    });
  });

  describe('Tool Execution', () => {
    it('calls fetch_scripture successfully', async () => {
      const result = await client.callTool({
        name: 'fetch_scripture',
        arguments: {
          reference: 'John 3:16',
        },
      }) as CallToolResult;

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.isError).toBeFalsy();

      // Verify content structure
      const firstContent = result.content[0];
      expect(firstContent.type).toBe('text');
      if ('text' in firstContent) {
        expect(firstContent.text).toBeDefined();
        expect(firstContent.text.length).toBeGreaterThan(0);
        console.log(`   ✅ fetch_scripture returned: ${firstContent.text.substring(0, 50)}...`);
      }
    }, 30000);

    it('calls fetch_translation_notes successfully', async () => {
      const result = await client.callTool({
        name: 'fetch_translation_notes',
        arguments: {
          reference: 'Genesis 1:1',
        },
      }) as CallToolResult;

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.isError).toBeFalsy();

      console.log(`   ✅ fetch_translation_notes returned ${result.content.length} content items`);
    }, 30000);

    it('calls get_context successfully', async () => {
      const result = await client.callTool({
        name: 'get_context',
        arguments: {
          reference: 'Psalm 23:1',
        },
      }) as CallToolResult;

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.isError).toBeFalsy();

      console.log('   ✅ get_context executed successfully');
    }, 30000);

    it('calls extract_references successfully', async () => {
      const result = await client.callTool({
        name: 'extract_references',
        arguments: {
          text: 'In the beginning (Genesis 1:1), God created. For God so loved the world (John 3:16).',
        },
      }) as CallToolResult;

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.isError).toBeFalsy();

      console.log('   ✅ extract_references executed successfully');
    }, 30000);

    it('handles tool errors gracefully', async () => {
      const result = await client.callTool({
        name: 'fetch_scripture',
        arguments: {
          reference: 'InvalidBook 999:999',
        },
      }) as CallToolResult;

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      
      // Should return error content
      const firstContent = result.content[0];
      expect(firstContent.type).toBe('text');
      if ('text' in firstContent) {
        expect(firstContent.text).toContain('Error');
      }

      console.log('   ✅ Tool errors handled gracefully');
    }, 30000);
  });

  describe('Protocol Compliance', () => {
    it('uses JSON-RPC 2.0 protocol', async () => {
      // The SDK handles JSON-RPC 2.0 automatically
      // We verify by successfully calling methods
      const result = await client.listTools();
      expect(result).toBeDefined();
      expect(result.tools).toBeDefined();
      
      console.log('   ✅ JSON-RPC 2.0 protocol working correctly');
    });

    it('maintains session across multiple requests', async () => {
      // Make multiple requests - they should all work with the same session
      const result1 = await client.listTools();
      expect(result1.tools.length).toBeGreaterThan(0);

      const result2 = await client.callTool({
        name: 'fetch_scripture',
        arguments: { reference: 'John 3:16' },
      }) as CallToolResult;
      expect(result2.content.length).toBeGreaterThan(0);

      const result3 = await client.listTools();
      expect(result3.tools.length).toBe(result1.tools.length);

      console.log('   ✅ Session maintained across multiple requests');
    }, 30000);
  });

  describe('MCP Inspector Compatibility', () => {
    it('provides all required MCP capabilities', async () => {
      // List tools should work (required for MCP Inspector)
      const toolsResult = await client.listTools();
      expect(toolsResult.tools).toBeDefined();
      expect(toolsResult.tools.length).toBeGreaterThan(0);

      // Call tool should work (required for MCP Inspector)
      const callResult = await client.callTool({
        name: 'fetch_scripture',
        arguments: { reference: 'John 3:16' },
      }) as CallToolResult;
      expect(callResult.content).toBeDefined();
      expect(callResult.content.length).toBeGreaterThan(0);

      console.log('   ✅ All MCP Inspector required capabilities working');
    }, 30000);

    it('returns properly formatted tool schemas for MCP Inspector', async () => {
      const result = await client.listTools();
      
      // MCP Inspector expects specific schema format
      for (const tool of result.tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        
        // Verify properties are well-formed objects
        const properties = tool.inputSchema.properties as Record<string, any>;
        for (const propSchema of Object.values(properties)) {
          expect(propSchema).toBeDefined();
          expect(typeof propSchema).toBe('object');
          // Properties should have type information
          expect(propSchema.type || propSchema.$ref || propSchema.anyOf || propSchema.oneOf).toBeDefined();
        }
      }

      console.log('   ✅ Tool schemas properly formatted for MCP Inspector');
    });
  });

  describe('Performance', () => {
    it('handles multiple sequential tool calls efficiently', async () => {
      const startTime = Date.now();
      
      // Make 5 sequential calls
      for (let i = 0; i < 5; i++) {
        const result = await client.callTool({
          name: 'fetch_scripture',
          arguments: { reference: 'John 3:16' },
        }) as CallToolResult;
        expect(result.content.length).toBeGreaterThan(0);
      }
      
      const duration = Date.now() - startTime;
      console.log(`   ✅ 5 sequential calls completed in ${duration}ms`);
      
      // Should complete reasonably fast (allowing for network latency)
      expect(duration).toBeLessThan(30000);
    }, 35000);
  });
});