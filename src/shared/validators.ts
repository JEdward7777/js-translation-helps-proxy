/**
 * Input validation utilities using Zod
 * Provides runtime type checking for tool arguments and configuration
 */

import { z } from 'zod';
import { toolArgumentsSchema, clientConfigSchema, filterConfigSchema } from '../core/types.js';
import { InvalidArgumentsError } from './errors.js';

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
   * Note: This is a legacy method. Prefer using ToolRegistry.validateToolArgs() for dynamic validation.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returns validated arguments of varying types
  static validateToolArguments(toolName: string, args: unknown): any {
    // For backward compatibility, do basic validation
    // Dynamic validation should be done via ToolRegistry.validateToolArgs()
    return toolArgumentsSchema.parse(args);
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