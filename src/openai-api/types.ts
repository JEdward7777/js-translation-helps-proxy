/**
 * OpenAI API types for chat completion interface
 * Based on OpenAI API specification
 */

// ============================================================================
// Chat Completion Request Types
// ============================================================================

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface FunctionDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
  strict?: boolean;
}

export interface ChatCompletionTool {
  type: 'function';
  function: FunctionDefinition;
}

export type ToolChoice = 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };

export interface ChatCompletionRequest {
  model: string;
  messages: ChatCompletionMessage[];
  tools?: ChatCompletionTool[];
  tool_choice?: ToolChoice;
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
  [key: string]: any; // Allow additional properties
}

// ============================================================================
// Chat Completion Response Types
// ============================================================================

export interface ChatCompletionChoice {
  index: number;
  message: ChatCompletionMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  logprobs?: any;
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: ChatCompletionUsage;
  system_fingerprint?: string;
}

// ============================================================================
// Streaming Response Types
// ============================================================================

export interface ChatCompletionChunkChoice {
  index: number;
  delta: {
    role?: 'assistant';
    content?: string;
    tool_calls?: Array<{
      index: number;
      id?: string;
      type?: 'function';
      function?: {
        name?: string;
        arguments?: string;
      };
    }>;
  };
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
  system_fingerprint?: string;
}

// ============================================================================
// Model Types
// ============================================================================

export interface Model {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}

export interface ModelList {
  object: 'list';
  data: Model[];
}

// ============================================================================
// Error Types
// ============================================================================

export interface OpenAIError {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

export class OpenAIAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly type: string = 'internal_error',
    public readonly param?: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'OpenAIAPIError';
  }

  toJSON(): OpenAIError {
    return {
      error: {
        message: this.message,
        type: this.type,
        param: this.param,
        code: this.code,
      },
    };
  }
}

// ============================================================================
// Tool Execution Types
// ============================================================================

export interface ToolExecutionResult {
  tool_call_id: string;
  role: 'tool';
  name: string;
  content: string;
}

export interface ToolExecutionContext {
  maxIterations?: number;
  currentIteration: number;
  toolResults: ToolExecutionResult[];
  messages: ChatCompletionMessage[];
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface OpenAIBridgeConfig {
  // Filter configuration (consistent with Interface 3.5)
  enabledTools?: string[]; // Limit which tools are available
  hiddenParams?: string[]; // Hide parameters from LLM (e.g., ['language', 'organization'])
  filterBookChapterNotes?: boolean; // Default: true
  
  // Tool execution settings
  maxToolIterations?: number; // Default: 5
  enableToolExecution?: boolean; // Default: true
  
  // Upstream settings
  upstreamUrl?: string;
  timeout?: number;
}