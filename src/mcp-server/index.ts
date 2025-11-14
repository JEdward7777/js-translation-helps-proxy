/**
 * MCP Server module - HTTP transport
 * Exports server and routes for use in HTTP applications
 */

export { SSEMCPServer } from './server.js';
export type { SSEServerConfig } from './server.js';
export { createMCPRoutes } from './routes.js';
export type { MCPRoutesConfig } from './routes.js';