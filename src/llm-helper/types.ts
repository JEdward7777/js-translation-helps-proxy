/**
 * Type definitions for LLM Helper
 * Supports OpenAI and Anthropic APIs with automatic tool execution
 */

import { FilterConfig } from '../core/types.js';

// ============================================================================
// LLM Provider Types
// ============================================================================

export type LLMProvider = 'openai' | 'anthropic';

export interface LLMProviderConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseURL?: string;
  timeout?: number;
}

// ============================================================================
// Chat Message Types
// ============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

export interface AnthropicChatMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContent[];
}

export type AnthropicContent = 
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, any> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

// ============================================================================
// Tool Call Types
// ============================================================================

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface AnthropicToolUse {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  id: string;
  name: string;
  content: string;
  isError?: boolean;
}

// ============================================================================
// Tool Definition Types
// ============================================================================

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
    strict?: boolean;
  };
}

export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// ============================================================================
// Request Types
// ============================================================================

export interface OpenAIRequest {
  model: string;
  messages: OpenAIChatMessage[];
  tools?: OpenAITool[];
  tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
}

export interface AnthropicRequest {
  model: string;
  messages: AnthropicChatMessage[];
  tools?: AnthropicTool[];
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  system?: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface OpenAIResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIChatMessage;
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContent[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ============================================================================
// Chat Response (Unified)
// ============================================================================

export interface ChatResponse {
  id: string;
  model: string;
  message: ChatMessage;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'max_tokens' | 'content_filter' | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: ToolCall[];
  rawResponse?: OpenAIResponse | AnthropicResponse;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface LLMHelperConfig {
  // LLM Provider settings
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseURL?: string;
  
  // Translation Helps settings
  translationHelpsConfig?: FilterConfig & {
    upstreamUrl?: string;
    timeout?: number;
  };
  
  // Tool execution settings
  maxToolIterations?: number;
  enableToolExecution?: boolean;
  
  // Baked-in filters (like Interface 4)
  language?: string; // Default: 'en'
  organization?: string; // Default: 'unfoldingWord'
  
  // LLM settings
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

// ============================================================================
// Tool Execution Types
// ============================================================================

export interface ToolExecutionOptions {
  maxIterations?: number;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (result: ToolResult) => void;
  onIteration?: (iteration: number, maxIterations: number) => void;
}

export interface ToolExecutionContext {
  iteration: number;
  maxIterations: number;
  messages: ChatMessage[];
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
}

// ============================================================================
// Error Types
// ============================================================================

export class LLMHelperError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'LLMHelperError';
  }
}

export class LLMProviderError extends LLMHelperError {
  constructor(message: string, statusCode?: number) {
    super(message, 'LLM_PROVIDER_ERROR', statusCode);
    this.name = 'LLMProviderError';
  }
}

export class ToolExecutionError extends LLMHelperError {
  constructor(message: string, public readonly toolName?: string) {
    super(message, 'TOOL_EXECUTION_ERROR');
    this.name = 'ToolExecutionError';
  }
}

export class MaxIterationsError extends LLMHelperError {
  constructor(maxIterations: number) {
    super(`Maximum tool iterations reached (${maxIterations})`, 'MAX_ITERATIONS_ERROR');
    this.name = 'MaxIterationsError';
  }
}

export class InvalidConfigError extends LLMHelperError {
  constructor(message: string) {
    super(message, 'INVALID_CONFIG_ERROR');
    this.name = 'InvalidConfigError';
  }
}