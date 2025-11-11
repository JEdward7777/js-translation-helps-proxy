/**
 * Shared utilities for the Translation Helps Proxy
 */

// Logger
export { Logger, LogLevel, logger, createLogger } from './logger.js';

// Error handling
export {
  TranslationHelpsError,
  UpstreamConnectionError,
  ToolNotFoundError,
  ToolDisabledError,
  InvalidArgumentsError,
  UpstreamResponseError,
  ErrorHandler,
  createTimeoutError,
  createNetworkError,
  createInvalidResponseError,
  createToolValidationError
} from './errors.js';

// Validation
export {
  Validator,
  validateRequired,
  validateString,
  validateNumber,
  validateBoolean,
  validateArray,
  fetchScriptureArgsSchema,
  fetchTranslationNotesArgsSchema,
  getSystemPromptArgsSchema,
  fetchTranslationQuestionsArgsSchema,
  getTranslationWordArgsSchema,
  browseTranslationWordsArgsSchema,
  getContextArgsSchema,
  extractReferencesArgsSchema
} from './validators.js';