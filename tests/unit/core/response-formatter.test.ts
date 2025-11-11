/**
 * Unit tests for ResponseFormatter
 */

import { describe, it, expect } from 'vitest';
import { ResponseFormatter } from '../../../src/core/response-formatter.js';

describe('ResponseFormatter', () => {
  describe('formatResponse', () => {
    it('should handle null response', () => {
      const result = ResponseFormatter.formatResponse(null);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('No response from upstream server');
    });

    it('should handle MCP-like content format', () => {
      const response = {
        content: [
          { type: 'text' as const, text: 'Hello' },
          { type: 'text' as const, text: 'World' }
        ]
      };

      const result = ResponseFormatter.formatResponse(response as any);
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Hello');
      expect(result[1].text).toBe('World');
    });

    it('should handle scripture format', () => {
      const response = {
        scripture: [
          { text: 'In the beginning', translation: 'KJV' },
          { text: 'God created', translation: 'NIV' }
        ]
      };

      const result = ResponseFormatter.formatResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('In the beginning (KJV)\n\nGod created (NIV)');
    });

    it('should handle scripture without translation', () => {
      const response = {
        scripture: [
          { text: 'In the beginning' },
          { text: 'God created' }
        ]
      };

      const result = ResponseFormatter.formatResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('In the beginning\n\nGod created');
    });

    it('should handle translation notes format', () => {
      const response = {
        reference: 'John 3:16',
        items: [
          { Note: 'First note', Reference: 'John 3:16' },
          { note: 'Second note', Reference: 'John 3:16' }
        ]
      };

      const result = ResponseFormatter.formatResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].text).toContain('Translation Notes for John 3:16');
      expect(result[0].text).toContain('1. First note');
      expect(result[0].text).toContain('2. Second note');
    });

    it('should handle notes with different field names', () => {
      const response = {
        reference: 'John 3:16',
        notes: [
          { Note: 'Note with capital N' },
          { note: 'Note with lowercase n' },
          { text: 'Note with text field' },
          { content: 'Note with content field' },
          { someOtherField: 'fallback to string' }
        ]
      };

      const result = ResponseFormatter.formatResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].text).toContain('1. Note with capital N');
      expect(result[0].text).toContain('2. Note with lowercase n');
      expect(result[0].text).toContain('3. Note with text field');
      expect(result[0].text).toContain('4. Note with content field');
      expect(result[0].text).toContain('5. [object Object]');
    });

    it('should handle empty notes array', () => {
      const response = {
        reference: 'John 3:16',
        items: []
      };

      const result = ResponseFormatter.formatResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('No translation notes found for this reference.');
    });

    it('should handle translation words format', () => {
      const response = {
        reference: 'John 3:16',
        words: [
          { term: 'love', definition: 'Strong affection' },
          { name: 'world', content: 'The earth and its inhabitants' }
        ]
      };

      const result = ResponseFormatter.formatResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].text).toContain('Translation Words for John 3:16');
      expect(result[0].text).toContain('**love**\nStrong affection');
      expect(result[0].text).toContain('**world**\nThe earth and its inhabitants');
    });

    it('should handle empty words array', () => {
      const response = {
        reference: 'John 3:16',
        words: []
      };

      const result = ResponseFormatter.formatResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('No translation words found for this reference.');
    });

    it('should handle single word format', () => {
      const response = {
        term: 'love',
        definition: 'Strong affection for another'
      };

      const result = ResponseFormatter.formatResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('**love**\nStrong affection for another');
    });

    it('should handle translation questions format', () => {
      const response = {
        reference: 'John 3:16',
        questions: [
          { question: 'What is love?', answer: 'Strong affection' },
          { Question: 'Capital Q', Answer: 'Capital A' }
        ]
      };

      const result = ResponseFormatter.formatResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].text).toContain('Translation Questions for John 3:16');
      expect(result[0].text).toContain('Q1: What is love?\nA: Strong affection');
      expect(result[0].text).toContain('Q2: Capital Q\nA: Capital A');
    });

    it('should handle empty questions array', () => {
      const response = {
        reference: 'John 3:16',
        questions: []
      };

      const result = ResponseFormatter.formatResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('No translation questions found for this reference.');
    });

    it('should handle wrapped result format', () => {
      const response = {
        result: { key: 'value', number: 42 }
      };

      const result = ResponseFormatter.formatResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('{\n  "key": "value",\n  "number": 42\n}');
    });

    it('should handle string result', () => {
      const response = {
        result: 'Simple string result'
      };

      const result = ResponseFormatter.formatResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Simple string result');
    });

    it('should fallback to JSON stringify for unknown format', () => {
      const response = {
        unknownField: 'unknown value',
        nested: { data: [1, 2, 3] }
      };

      const result = ResponseFormatter.formatResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].text).toContain('"unknownField": "unknown value"');
      expect(result[0].text).toContain('"nested":');
    });
  });

  describe('formatError', () => {
    it('should format error messages', () => {
      const result = ResponseFormatter.formatError('Test error');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Error: Test error');
    });

    it('should format Error objects', () => {
      const error = new Error('Test error message');
      const result = ResponseFormatter.formatError(error);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Error: Test error message');
    });
  });

  describe('formatSuccess', () => {
    it('should format success messages', () => {
      const result = ResponseFormatter.formatSuccess('Operation completed');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Operation completed');
    });
  });
});