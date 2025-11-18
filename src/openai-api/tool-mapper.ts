/**
 * Tool mapper - Convert between MCP and OpenAI tool formats
 * Based on MCP-Bridge tool_mappers logic
 */

import { Tool } from '../core/types.js';
import { ChatCompletionTool, FunctionDefinition, ToolCall } from './types.js';
import { logger } from '../shared/index.js';

/**
 * Convert MCP tool schema to OpenAI function definition
 * Maps MCP inputSchema to OpenAI parameters format
 */
export function mcpToolToOpenAI(mcpTool: Tool): ChatCompletionTool {
  logger.debug(`Converting MCP tool to OpenAI format: ${mcpTool.name}`);

  const functionDef: FunctionDefinition = {
    name: mcpTool.name,
    description: mcpTool.description,
    parameters: {
      type: 'object',
      properties: mcpTool.inputSchema.properties || {},
      required: mcpTool.inputSchema.required || [],
      additionalProperties: false,
    },
  };

  return {
    type: 'function',
    function: functionDef,
  };
}

/**
 * Convert array of MCP tools to OpenAI tools format
 */
export function mcpToolsToOpenAI(mcpTools: Tool[]): ChatCompletionTool[] {
  return mcpTools.map(mcpToolToOpenAI);
}

/**
 * Convert OpenAI tool call to MCP tool call format
 * Parses the function arguments JSON string
 */
export function openaiToolCallToMCP(toolCall: ToolCall): {
  name: string;
  arguments: Record<string, any>;
  id: string;
} {
  logger.debug(`Converting OpenAI tool call to MCP format: ${toolCall.function.name}`);

  let args: Record<string, any> = {};
  
  try {
    // Parse the arguments JSON string
    if (toolCall.function.arguments) {
      args = JSON.parse(toolCall.function.arguments);
    }
  } catch (error) {
    logger.error(`Failed to parse tool call arguments for ${toolCall.function.name}`, error);
    throw new Error(`Invalid tool call arguments: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    name: toolCall.function.name,
    arguments: args,
    id: toolCall.id,
  };
}

/**
 * Convert MCP tool result to OpenAI tool message format
 */
export function mcpResultToOpenAI(
  toolCallId: string,
  toolName: string,
  result: Array<{ type: 'text'; text: string }>
): {
  role: 'tool';
  tool_call_id: string;
  name: string;
  content: string;
} {
  // Combine all text content from MCP result
  const content = result.map(item => item.text).join('\n\n');

  return {
    role: 'tool',
    tool_call_id: toolCallId,
    name: toolName,
    content,
  };
}

/**
 * Validate OpenAI tool call structure
 */
export function validateToolCall(toolCall: any): toolCall is ToolCall {
  if (!toolCall || typeof toolCall !== 'object') {
    return false;
  }

  if (!toolCall.id || typeof toolCall.id !== 'string') {
    return false;
  }

  if (toolCall.type !== 'function') {
    return false;
  }

  if (!toolCall.function || typeof toolCall.function !== 'object') {
    return false;
  }

  if (!toolCall.function.name || typeof toolCall.function.name !== 'string') {
    return false;
  }

  if (!toolCall.function.arguments || typeof toolCall.function.arguments !== 'string') {
    return false;
  }

  return true;
}
