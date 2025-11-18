/**
 * Integration tests for HTTP MCP Server
 * Tests the HTTP MCP interface (Interface 2)
 */

import { describe, it, expect } from 'vitest';
import { createMCPRoutes } from '../../../src/mcp-server/routes.js';

describe('HTTP MCP Server (Integration)', () => {
  describe('Route Handler Tests', () => {
    it('should create MCP routes app', () => {
      const app = createMCPRoutes();
      expect(app).toBeDefined();
    });

    it('should create MCP routes with configuration', () => {
      const app = createMCPRoutes({
        enabledTools: ['fetch_scripture'],
        hiddenParams: ['language'],
        filterBookChapterNotes: true,
      });
      expect(app).toBeDefined();
    });

    it('should handle health check endpoint', async () => {
      const app = createMCPRoutes();
      
      const req = new Request('http://localhost/mcp/health');
      const res = await app.fetch(req);
      
      expect(res.status).toBeLessThan(600);
      const data = await res.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
    }, 30000);

    it('should handle info endpoint', async () => {
      const app = createMCPRoutes();
      
      const req = new Request('http://localhost/mcp/info');
      const res = await app.fetch(req);
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('name', 'js-translation-helps-proxy');
      expect(data).toHaveProperty('protocol', 'mcp');
      expect(data).toHaveProperty('transport', 'http');
    });

    it('should handle tools/list request', async () => {
      const app = createMCPRoutes();
      
      const req = new Request('http://localhost/mcp/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {}
        })
      });
      
      const res = await app.fetch(req);
      expect(res.status).toBeLessThan(600);
      
      const data = await res.json();
      if (res.status === 200) {
        expect(data).toHaveProperty('tools');
        expect(Array.isArray(data.tools)).toBe(true);
      }
    }, 30000);

    it('should handle tools/call request', async () => {
      const app = createMCPRoutes();
      
      const req = new Request('http://localhost/mcp/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'fetch_scripture',
            arguments: {
              reference: 'John 3:16'
            }
          }
        })
      });
      
      const res = await app.fetch(req);
      expect(res.status).toBeLessThan(600);
      
      const data = await res.json();
      if (res.status === 200) {
        expect(data).toHaveProperty('content');
      }
    }, 30000);

    it('should reject request with missing method', async () => {
      const app = createMCPRoutes();
      
      const req = new Request('http://localhost/mcp/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          params: {}
        })
      });
      
      const res = await app.fetch(req);
      expect(res.status).toBe(400);
      
      const data = await res.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('method');
    });

    it('should reject tools/call without tool name', async () => {
      const app = createMCPRoutes();
      
      const req = new Request('http://localhost/mcp/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {}
        })
      });
      
      const res = await app.fetch(req);
      expect(res.status).toBe(400);
      
      const data = await res.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('tool name');
    });

    it('should reject unknown method', async () => {
      const app = createMCPRoutes();
      
      const req = new Request('http://localhost/mcp/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 5,
          method: 'unknown/method',
          params: {}
        })
      });
      
      const res = await app.fetch(req);
      expect(res.status).toBe(400);
      
      const data = await res.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Unknown method');
    });
  });
});

/**
 * Note: These tests use Hono's built-in request handling to test the routes directly.
 * For full end-to-end testing against a live server, use:
 * 
 * ```bash
 * # Start the server
 * npm run dev:http
 * 
 * # In another terminal, test with curl
 * curl -X POST http://localhost:8787/mcp/message \
 *   -H "Content-Type: application/json" \
 *   -d '{"method":"tools/list","params":{}}'
 * ```
 */