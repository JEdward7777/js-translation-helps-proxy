/**
 * TypeScript types and interfaces for the Translation Helps Proxy
 * Preserves exact tool schemas from Python implementation
 */

import { z } from 'zod';

// ============================================================================
// Tool Schemas (preserved from Python version)
// ============================================================================

export const fetchScriptureSchema = {
  name: 'fetch_scripture',
  description: 'Fetch Bible scripture text for a specific reference',
  inputSchema: {
    type: 'object' as const,
    properties: {
      reference: {
        type: 'string' as const,
        description: 'Bible reference (e.g., "John 3:16", "Romans 8:1-11")'
      },
      language: {
        type: 'string' as const,
        description: 'Language code (default: "en")',
        default: 'en'
      },
      organization: {
        type: 'string' as const,
        description: 'Organization name (default: "unfoldingWord")',
        default: 'unfoldingWord'
      }
    },
    required: ['reference']
  }
} as const;

export const fetchTranslationNotesSchema = {
  name: 'fetch_translation_notes',
  description: 'Fetch translation notes for a specific Bible reference',
  inputSchema: {
    type: 'object' as const,
    properties: {
      reference: {
        type: 'string' as const,
        description: 'Bible reference (e.g., "John 3:16")'
      },
      language: {
        type: 'string' as const,
        description: 'Language code (default: "en")',
        default: 'en'
      },
      organization: {
        type: 'string' as const,
        description: 'Organization name (default: "unfoldingWord")',
        default: 'unfoldingWord'
      }
    },
    required: ['reference']
  }
} as const;

export const getSystemPromptSchema = {
  name: 'get_system_prompt',
  description: 'Get the complete system prompt and constraints',
  inputSchema: {
    type: 'object' as const,
    properties: {
      includeImplementationDetails: {
        type: 'boolean' as const,
        description: 'Include implementation details (default: false)',
        default: false
      }
    },
    required: []
  }
} as const;

export const fetchTranslationQuestionsSchema = {
  name: 'fetch_translation_questions',
  description: 'Fetch translation questions for a specific Bible reference',
  inputSchema: {
    type: 'object' as const,
    properties: {
      reference: {
        type: 'string' as const,
        description: 'Bible reference (e.g., "John 3:16")'
      },
      language: {
        type: 'string' as const,
        description: 'Language code (default: "en")',
        default: 'en'
      },
      organization: {
        type: 'string' as const,
        description: 'Organization name (default: "unfoldingWord")',
        default: 'unfoldingWord'
      }
    },
    required: ['reference']
  }
} as const;

export const getTranslationWordSchema = {
  name: 'get_translation_word',
  description: 'Get translation words linked to a specific Bible reference',
  inputSchema: {
    type: 'object' as const,
    properties: {
      reference: {
        type: 'string' as const,
        description: 'Bible reference (e.g., "John 3:16")'
      },
      wordId: {
        type: 'string' as const,
        description: 'Specific word ID (optional)'
      },
      language: {
        type: 'string' as const,
        description: 'Language code (default: "en")',
        default: 'en'
      },
      organization: {
        type: 'string' as const,
        description: 'Organization name (default: "unfoldingWord")',
        default: 'unfoldingWord'
      }
    },
    required: ['reference']
  }
} as const;

export const browseTranslationWordsSchema = {
  name: 'browse_translation_words',
  description: 'Browse and search translation words by category or term',
  inputSchema: {
    type: 'object' as const,
    properties: {
      language: {
        type: 'string' as const,
        description: 'Language code (default: "en")',
        default: 'en'
      },
      organization: {
        type: 'string' as const,
        description: 'Organization name (default: "unfoldingWord")',
        default: 'unfoldingWord'
      },
      category: {
        type: 'string' as const,
        description: 'Category filter (optional)'
      },
      search: {
        type: 'string' as const,
        description: 'Search term (optional)'
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum results to return (default: 50)',
        default: 50
      }
    },
    required: []
  }
} as const;

export const getContextSchema = {
  name: 'get_context',
  description: 'Get contextual information for a Bible reference',
  inputSchema: {
    type: 'object' as const,
    properties: {
      reference: {
        type: 'string' as const,
        description: 'Bible reference (e.g., "John 3:16")'
      },
      language: {
        type: 'string' as const,
        description: 'Language code (default: "en")',
        default: 'en'
      },
      organization: {
        type: 'string' as const,
        description: 'Organization name (default: "unfoldingWord")',
        default: 'unfoldingWord'
      }
    },
    required: ['reference']
  }
} as const;

export const extractReferencesSchema = {
  name: 'extract_references',
  description: 'Extract and parse Bible references from text',
  inputSchema: {
    type: 'object' as const,
    properties: {
      text: {
        type: 'string' as const,
        description: 'Text containing Bible references'
      },
      includeContext: {
        type: 'boolean' as const,
        description: 'Include contextual information (default: false)',
        default: false
      }
    },
    required: ['text']
  }
} as const;

// Additional tools discovered from upstream (may vary)
export const fetchResourcesSchema = {
  name: 'fetch_resources',
  description: 'Fetch resources for a specific reference',
  inputSchema: {
    type: 'object' as const,
    properties: {
      reference: {
        type: 'string' as const,
        description: 'Bible reference'
      },
      language: {
        type: 'string' as const,
        description: 'Language code (default: "en")',
        default: 'en'
      },
      organization: {
        type: 'string' as const,
        description: 'Organization name (default: "unfoldingWord")',
        default: 'unfoldingWord'
      }
    },
    required: ['reference']
  }
} as const;

export const getWordsForReferenceSchema = {
  name: 'get_words_for_reference',
  description: 'Get translation words for a specific reference',
  inputSchema: {
    type: 'object' as const,
    properties: {
      reference: {
        type: 'string' as const,
        description: 'Bible reference'
      },
      language: {
        type: 'string' as const,
        description: 'Language code (default: "en")',
        default: 'en'
      },
      organization: {
        type: 'string' as const,
        description: 'Organization name (default: "unfoldingWord")',
        default: 'unfoldingWord'
      }
    },
    required: ['reference']
  }
} as const;

export const searchResourcesSchema = {
  name: 'search_resources',
  description: 'Search for resources',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string' as const,
        description: 'Search query'
      },
      language: {
        type: 'string' as const,
        description: 'Language code (default: "en")',
        default: 'en'
      },
      organization: {
        type: 'string' as const,
        description: 'Organization name (default: "unfoldingWord")',
        default: 'unfoldingWord'
      }
    },
    required: ['query']
  }
} as const;

export const getLanguagesSchema = {
  name: 'get_languages',
  description: 'Get available languages',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: []
  }
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

export type ToolSchema = typeof fetchScriptureSchema | typeof fetchTranslationNotesSchema |
  typeof getSystemPromptSchema | typeof fetchTranslationQuestionsSchema |
  typeof getTranslationWordSchema | typeof browseTranslationWordsSchema |
  typeof getContextSchema | typeof extractReferencesSchema |
  typeof fetchResourcesSchema | typeof getWordsForReferenceSchema |
  typeof searchResourcesSchema | typeof getLanguagesSchema;

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * MCP-compatible tool type
 * @public - Part of the library's public API for external consumers
 */
export interface MCPTool extends Tool {}

/**
 * OpenAI-compatible tool type
 * @public - Part of the library's public API for external consumers
 */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
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
  result?: any;
  content?: Array<{
    type: 'text';
    text: string;
  }>;
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

export type ToolName = ToolSchema['name'];

/**
 * Utility type for mapping tool names to method names
 * @public - Part of the library's public API for external consumers
 */
export type ToolMethodName = ToolName extends `${infer Method}_scripture` ? `fetchScripture` :
  ToolName extends `${infer Method}_translation_notes` ? `fetchTranslationNotes` :
  ToolName extends `get_system_prompt` ? `getSystemPrompt` :
  ToolName extends `${infer Method}_translation_questions` ? `fetchTranslationQuestions` :
  ToolName extends `get_translation_word` ? `getTranslationWord` :
  ToolName extends `browse_translation_words` ? `browseTranslationWords` :
  ToolName extends `get_context` ? `getContext` :
  ToolName extends `extract_references` ? `extractReferences` :
  ToolName extends `fetch_resources` ? `fetchResources` :
  ToolName extends `get_words_for_reference` ? `getWordsForReference` :
  ToolName extends `search_resources` ? `searchResources` :
  ToolName extends `get_languages` ? `getLanguages` :
  string;