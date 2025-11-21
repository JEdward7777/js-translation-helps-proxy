/**
 * Input validation utilities using Zod
 * Provides runtime type checking for tool arguments and configuration
 */

import { z } from 'zod';
import { toolArgumentsSchema, clientConfigSchema, filterConfigSchema } from '../core/types.js';
import { InvalidArgumentsError } from './errors.js';

// ============================================================================
// Tool-specific validation schemas
// ============================================================================

const fetchScriptureArgsSchema = z.object({
  reference: z.string().min(1, 'Reference is required'),
  language: z.string().optional().default('en'),
  organization: z.string().optional().default('unfoldingWord')
});

const fetchTranslationNotesArgsSchema = z.object({
  reference: z.string().min(1, 'Reference is required'),
  language: z.string().optional().default('en'),
  organization: z.string().optional().default('unfoldingWord')
});

const getSystemPromptArgsSchema = z.object({
  includeImplementationDetails: z.boolean().optional().default(false)
});

const fetchTranslationQuestionsArgsSchema = z.object({
  reference: z.string().min(1, 'Reference is required'),
  language: z.string().optional().default('en'),
  organization: z.string().optional().default('unfoldingWord')
});

const getTranslationWordArgsSchema = z.object({
  reference: z.string().min(1, 'Reference is required'),
  wordId: z.string().optional(),
  language: z.string().optional().default('en'),
  organization: z.string().optional().default('unfoldingWord')
});

const browseTranslationWordsArgsSchema = z.object({
  language: z.string().optional().default('en'),
  organization: z.string().optional().default('unfoldingWord'),
  category: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().optional().default(50)
});

const getContextArgsSchema = z.object({
  reference: z.string().min(1, 'Reference is required'),
  language: z.string().optional().default('en'),
  organization: z.string().optional().default('unfoldingWord')
});

const extractReferencesArgsSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  includeContext: z.boolean().optional().default(false)
});

// ============================================================================
// Validation functions
// ============================================================================

export class Validator {
  /**
   * Validates tool arguments against a schema
   */
  static validateToolArgs<T>(
    toolName: string,
    args: unknown,
    schema: z.ZodSchema<T>
  ): T {
    try {
      return schema.parse(args);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new InvalidArgumentsError(
          `Invalid arguments for tool '${toolName}': ${issues.join(', ')}`
        );
      }
      throw error;
    }
  }

  /**
   * Validates client configuration
   */
  static validateClientConfig(config: unknown) {
    return clientConfigSchema.parse(config);
  }

  /**
   * Validates filter configuration
   */
  static validateFilterConfig(config: unknown) {
    return filterConfigSchema.parse(config);
  }

  /**
   * Type-safe tool argument validation by tool name
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returns validated arguments of varying types
  static validateToolArguments(toolName: string, args: unknown): any {
    switch (toolName) {
      case 'fetch_scripture':
        return this.validateToolArgs(toolName, args, fetchScriptureArgsSchema);
      case 'fetch_translation_notes':
        return this.validateToolArgs(toolName, args, fetchTranslationNotesArgsSchema);
      case 'get_system_prompt':
        return this.validateToolArgs(toolName, args, getSystemPromptArgsSchema);
      case 'fetch_translation_questions':
        return this.validateToolArgs(toolName, args, fetchTranslationQuestionsArgsSchema);
      case 'get_translation_word':
      case 'fetch_translation_words':
        return this.validateToolArgs(toolName, args, getTranslationWordArgsSchema);
      case 'browse_translation_words':
        return this.validateToolArgs(toolName, args, browseTranslationWordsArgsSchema);
      case 'get_context':
        return this.validateToolArgs(toolName, args, getContextArgsSchema);
      case 'extract_references':
        return this.validateToolArgs(toolName, args, extractReferencesArgsSchema);
      default:
        // For unknown tools, do basic validation
        return toolArgumentsSchema.parse(args);
    }
  }

  /**
   * Validates Bible reference format (basic validation)
   */
  static validateBibleReference(reference: string): boolean {
    // Basic pattern: Book Chapter:Verse or Book Chapter:Verse-Verse
    const pattern = /^[A-Za-z0-9\s]+ \d+:\d+(-\d+)?$/;
    return pattern.test(reference.trim());
  }

  /**
   * Validates language code (ISO 639-1)
   */
  static validateLanguageCode(code: string): boolean {
    const pattern = /^[a-z]{2,3}$/;
    return pattern.test(code.toLowerCase());
  }

  /**
   * Validates organization name
   */
  static validateOrganization(org: string): boolean {
    // Basic validation - non-empty string, no special chars
    const pattern = /^[a-zA-Z0-9_-]+$/;
    return pattern.test(org) && org.length > 0;
  }
}