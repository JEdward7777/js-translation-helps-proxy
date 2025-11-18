/**
 * Custom error classes for the Translation Helps Proxy
 * Extends the base errors from types.ts with additional functionality
 */

import {
  TranslationHelpsError,
  UpstreamConnectionError,
  ToolNotFoundError,
  ToolDisabledError,
  InvalidArgumentsError,
  UpstreamResponseError
} from '../core/types.js';

// Re-export all error classes for convenience
export {
  TranslationHelpsError,
  UpstreamConnectionError,
  ToolNotFoundError,
  ToolDisabledError,
  InvalidArgumentsError,
  UpstreamResponseError
};

// Additional error utilities

export class ErrorHandler {
  /**
   * Wraps a function call with error handling
   */
  static async wrap<T>(
    fn: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof TranslationHelpsError) {
        throw error;
      }

      // Wrap unknown errors
      throw new TranslationHelpsError(
        `Unexpected error during ${context}: ${error instanceof Error ? error.message : String(error)}`,
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Creates a user-friendly error message from any error
   */
  static getUserMessage(error: unknown): string {
    if (error instanceof TranslationHelpsError) {
      return error.message;
    }

    if (error instanceof Error) {
      return `An error occurred: ${error.message}`;
    }

    return `An unknown error occurred: ${String(error)}`;
  }

  /**
   * Checks if an error is retryable
   */
  static isRetryable(error: unknown): boolean {
    if (error instanceof UpstreamConnectionError) {
      return true;
    }

    if (error instanceof UpstreamResponseError) {
      // Retry on 5xx errors
      return error.statusCode ? error.statusCode >= 500 : false;
    }

    return false;
  }
}