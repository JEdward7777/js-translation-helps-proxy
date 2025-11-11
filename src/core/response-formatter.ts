/**
 * Response formatter for converting upstream responses to MCP format
 * Preserves exact formatting logic from Python implementation
 */

import { UpstreamResponse, TextContent } from './types.js';
import { logger } from '../shared/index.js';

export class ResponseFormatter {
  /**
   * Format upstream response to MCP TextContent array
   * This is the main entry point that handles all response types
   */
  static formatResponse(response: UpstreamResponse | null): TextContent[] {
    if (!response) {
      return [{ type: 'text', text: 'No response from upstream server' }];
    }

    // Handle MCP-like format (already formatted)
    if ('content' in response && Array.isArray(response.content)) {
      return response.content.map((item: any) => {
        if (item.type === 'text') {
          return { type: 'text', text: item.text } as TextContent;
        }
        return { type: 'text', text: JSON.stringify(item) } as TextContent;
      });
    }

    // Scripture format
    if ('scripture' in response && Array.isArray(response.scripture)) {
      return this.formatScripture(response.scripture);
    }

    // Translation notes format
    if ('notes' in response || 'verseNotes' in response || 'items' in response) {
      const notes = response.notes || response.verseNotes || response.items;
      return this.formatNotes(response, notes);
    }

    // Translation words format
    if ('words' in response && Array.isArray(response.words)) {
      return this.formatWords(response.words, (response as any).reference);
    }

    // Single translation word format
    if ('term' in response && 'definition' in response) {
      return this.formatSingleWord(response.term, response.definition);
    }

    // Translation questions format
    if ('questions' in response && Array.isArray(response.questions)) {
      return this.formatQuestions(response.questions, (response as any).reference);
    }

    // Wrapped result format
    if ('result' in response) {
      return this.formatResult(response.result);
    }

    // Fallback: stringify the whole response
    return this.formatFallback(response);
  }

  /**
   * Format scripture response
   */
  private static formatScripture(scriptureList: any[]): TextContent[] {
    if (!scriptureList || scriptureList.length === 0) {
      return [{ type: 'text', text: 'No scripture text found' }];
    }

    const formatted = scriptureList.map((s: any) => {
      let text = s.text || '';
      if (s.translation) {
        text += ` (${s.translation})`;
      }
      return text;
    }).join('\n\n');

    return [{ type: 'text', text: formatted }];
  }

  /**
   * Format translation notes response
   */
  private static formatNotes(response: any, notes: any[]): TextContent[] {
    if (!Array.isArray(notes) || notes.length === 0) {
      return [{ type: 'text', text: 'No translation notes found for this reference.' }];
    }

    let text = `Translation Notes for ${(response as any).reference || 'Reference'}:\n\n`;
    notes.forEach((note: any, i: number) => {
      const content = note.Note || note.note || note.text || note.content || String(note);
      text += `${i + 1}. ${content}\n\n`;
    });

    return [{ type: 'text', text }];
  }

  /**
   * Format translation words response
   */
  private static formatWords(words: any[], reference?: string): TextContent[] {
    if (!Array.isArray(words) || words.length === 0) {
      return [{ type: 'text', text: 'No translation words found for this reference.' }];
    }

    let text = `Translation Words for ${reference || 'Reference'}:\n\n`;
    words.forEach((word: any) => {
      const term = word.term || word.name || 'Unknown Term';
      const definition = word.definition || word.content || 'No definition available';
      text += `**${term}**\n${definition}\n\n`;
    });

    return [{ type: 'text', text }];
  }

  /**
   * Format single translation word response
   */
  private static formatSingleWord(term: string, definition: string): TextContent[] {
    const text = `**${term}**\n${definition}`;
    return [{ type: 'text', text }];
  }

  /**
   * Format translation questions response
   */
  private static formatQuestions(questions: any[], reference?: string): TextContent[] {
    if (!Array.isArray(questions) || questions.length === 0) {
      return [{ type: 'text', text: 'No translation questions found for this reference.' }];
    }

    let text = `Translation Questions for ${reference || 'Reference'}:\n\n`;
    questions.forEach((q: any, i: number) => {
      const question = q.question || q.Question || 'No question';
      const answer = q.answer || q.Answer || 'No answer';
      text += `Q${i + 1}: ${question}\nA: ${answer}\n\n`;
    });

    return [{ type: 'text', text }];
  }

  /**
   * Format wrapped result response
   */
  private static formatResult(result: any): TextContent[] {
    const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    return [{ type: 'text', text }];
  }

  /**
   * Format fallback response
   */
  private static formatFallback(response: any): TextContent[] {
    const text = JSON.stringify(response, null, 2);
    return [{ type: 'text', text }];
  }

  /**
   * Format error response
   */
  static formatError(error: Error | string): TextContent[] {
    const message = error instanceof Error ? error.message : error;
    logger.error('Formatting error response', { message });
    return [{ type: 'text', text: `Error: ${message}` }];
  }

  /**
   * Format success message
   */
  static formatSuccess(message: string): TextContent[] {
    return [{ type: 'text', text: message }];
  }
}