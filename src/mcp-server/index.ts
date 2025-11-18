/**
 * MCP Server module - HTTP transport
 * Exports official MCP Streamable HTTP transport and legacy routes
 */

// Official MCP Streamable HTTP transport (recommended)
export { createStreamableMCPRoutes } from './streamable-transport.js';
export type { StreamableTransportConfig } from './streamable-transport.js';

// Legacy exports (kept for backwards compatibility, but deprecated)
export { SSEMCPServer } from './server.js';
export type { SSEServerConfig } from './server.js';
export { createMCPRoutes } from './routes.js';
export type { MCPRoutesConfig } from './routes.js';