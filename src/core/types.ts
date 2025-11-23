/**
 * TypeScript types and interfaces for the Translation Helps Proxy
 * Uses dynamic tool discovery from upstream MCP server
 */

import { z } from 'zod';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool schema properties are dynamic
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * MCP-compatible tool type
 * @public - Part of the library's public API for external consumers
 */
export type MCPTool = Tool;

/**
 * OpenAI-compatible tool type
 * @public - Part of the library's public API for external consumers
 */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- OpenAI function parameters are dynamic
    parameters: Record<string, any>;
    strict?: boolean;
  };
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface UpstreamClientConfig {
  upstreamUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  
  // Retry configuration
  maxRetries?: number;           // Default: 3
  retryDelay?: number;            // Default: 1000ms (1 second)
  retryBackoff?: number;          // Default: 2 (exponential)
  retryableStatusCodes?: number[]; // Default: [408, 429, 500, 502, 503, 504]
}

export interface FilterConfig {
  enabledTools?: string[];
  hiddenParams?: string[];
  filterBookChapterNotes?: boolean;
}

export interface TranslationHelpsClientConfig extends FilterConfig {
  upstreamUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// Tool call arguments (generic)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic tool arguments
export type ToolArguments = Record<string, any>;

// Upstream response types
export interface ScriptureResponse {
  scripture: Array<{
    text: string;
    translation?: string;
  }>;
}

export interface NotesResponse {
  notes?: Array<{
    Note?: string;
    note?: string;
    text?: string;
    content?: string;
    Reference?: string;
  }>;
  verseNotes?: Array<{
    Note?: string;
    note?: string;
    text?: string;
    content?: string;
    Reference?: string;
  }>;
  items?: Array<{
    Note?: string;
    note?: string;
    text?: string;
    content?: string;
    Reference?: string;
  }>;
  metadata?: {
    totalCount?: number;
  };
}

export interface WordsResponse {
  words: Array<{
    term?: string;
    name?: string;
    definition?: string;
    content?: string;
  }>;
}

export interface SingleWordResponse {
  term: string;
  definition: string;
}

export interface QuestionsResponse {
  questions: Array<{
    question?: string;
    Question?: string;
    answer?: string;
    Answer?: string;
  }>;
}

export interface GenericResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic response result
  result?: any;
  content?: Array<{
    type: 'text';
    text: string;
  }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Allow additional response properties
  [key: string]: any;
}

export type UpstreamResponse = ScriptureResponse | NotesResponse | WordsResponse |
  SingleWordResponse | QuestionsResponse | GenericResponse;

// MCP TextContent type
export interface TextContent {
  type: 'text';
  text: string;
}

// Tool result type
export type ToolResult = TextContent[];

// ============================================================================
// Error Types
// ============================================================================

export class TranslationHelpsError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'TranslationHelpsError';
  }
}

export class UpstreamConnectionError extends TranslationHelpsError {
  constructor(message: string) {
    super(message, 'UPSTREAM_CONNECTION_ERROR');
    this.name = 'UpstreamConnectionError';
  }
}

export class ToolNotFoundError extends TranslationHelpsError {
  constructor(toolName: string) {
    super(`Tool '${toolName}' not found`, 'TOOL_NOT_FOUND');
    this.name = 'ToolNotFoundError';
  }
}

export class ToolDisabledError extends TranslationHelpsError {
  constructor(toolName: string) {
    super(`Tool '${toolName}' is disabled`, 'TOOL_DISABLED');
    this.name = 'ToolDisabledError';
  }
}

export class InvalidArgumentsError extends TranslationHelpsError {
  constructor(message: string) {
    super(message, 'INVALID_ARGUMENTS');
    this.name = 'InvalidArgumentsError';
  }
}

export class UpstreamResponseError extends TranslationHelpsError {
  constructor(message: string, public readonly statusCode?: number) {
    super(message, 'UPSTREAM_RESPONSE_ERROR');
    this.name = 'UpstreamResponseError';
  }
}

// ============================================================================
// Validation Schemas (Zod)
// ============================================================================

export const toolArgumentsSchema = z.record(z.any());

export const filterConfigSchema = z.object({
  enabledTools: z.array(z.string()).optional(),
  hiddenParams: z.array(z.string()).optional(),
  filterBookChapterNotes: z.boolean().optional()
});

export const clientConfigSchema = filterConfigSchema.extend({
  upstreamUrl: z.string().url().optional(),
  timeout: z.number().positive().optional(),
  headers: z.record(z.string()).optional()
});

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Tool name type - dynamically determined from upstream
 * @public - Part of the library's public API for external consumers
 */
export type ToolName = string;