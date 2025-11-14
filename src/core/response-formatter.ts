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
   * Based on actual upstream response formats (see test-data/upstream-responses/)
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

    // Context format (aggregated response with multiple arrays)
    // Check this BEFORE scripture format since context can also have scripture
    // See test-data/upstream-responses/get_context.json
    if ('translationNotes' in response || 'translationWords' in response || 'translationQuestions' in response) {
      return this.formatContext(response);
    }

    // Scripture format (upstream returns 'scripture' array)
    // See test-data/upstream-responses/fetch_scripture.json
    if ('scripture' in response && Array.isArray(response.scripture)) {
      return this.formatScripture(response.scripture);
    }

    // Translation notes format (upstream returns 'items' array)
    // See test-data/upstream-responses/fetch_translation_notes.json
    if ('items' in response && Array.isArray(response.items)) {
      // Check if this is translation questions (has Question/Response fields)
      if (response.items.length > 0 && ('Question' in response.items[0] || 'question' in response.items[0])) {
        return this.formatQuestions(response.items, (response as any).reference);
      }
      // Check if this is translation words (has term/definition fields)
      if (response.items.length > 0 && ('term' in response.items[0] || 'definition' in response.items[0])) {
        return this.formatWords(response.items, (response as any).reference);
      }
      // Otherwise, it's translation notes (has Note field)
      return this.formatNotes(response, response.items);
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
   * Upstream format: items array with Note field
   */
  private static formatNotes(response: any, notes: any[]): TextContent[] {
    if (!Array.isArray(notes) || notes.length === 0) {
      return [{ type: 'text', text: 'No translation notes found for this reference.' }];
    }

    let text = `Translation Notes for ${response.reference || 'Reference'}:\n\n`;
    notes.forEach((note: any, i: number) => {
      // Upstream uses 'Note' field (capital N)
      const content = note.Note || note.note || note.text || note.content || String(note);
      text += `${i + 1}. ${content}\n\n`;
    });

    return [{ type: 'text', text }];
  }

  /**
   * Format translation words response
   * Upstream format: items array with term and definition fields
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
   * Format translation questions response
   * Upstream format: items array with Question and Response fields
   */
  private static formatQuestions(questions: any[], reference?: string): TextContent[] {
    if (!Array.isArray(questions) || questions.length === 0) {
      return [{ type: 'text', text: 'No translation questions found for this reference.' }];
    }

    let text = `Translation Questions for ${reference || 'Reference'}:\n\n`;
    questions.forEach((q: any, i: number) => {
      // Upstream uses 'Question' and 'Response' fields (capital letters)
      const question = q.Question || q.question || 'No question';
      const answer = q.Response || q.response || q.Answer || q.answer || 'No answer';
      text += `Q${i + 1}: ${question}\nA: ${answer}\n\n`;
    });

    return [{ type: 'text', text }];
  }

  /**
   * Format context response (aggregated data from multiple sources)
   * Upstream format: object with translationNotes, translationWords, etc. arrays
   */
  private static formatContext(response: any): TextContent[] {
    let text = `Context for ${response.reference || 'Reference'}:\n\n`;

    // Add scripture if present
    if (response.scripture && Array.isArray(response.scripture) && response.scripture.length > 0) {
      text += '## Scripture\n\n';
      response.scripture.forEach((s: any) => {
        let scriptureText = s.text || '';
        if (s.translation) {
          scriptureText += ` (${s.translation})`;
        }
        text += `${scriptureText}\n\n`;
      });
    }

    // Add translation notes if present
    if (response.translationNotes && Array.isArray(response.translationNotes) && response.translationNotes.length > 0) {
      text += '## Translation Notes\n\n';
      response.translationNotes.forEach((note: any, i: number) => {
        const content = note.Note || note.note || note.text || note.content || String(note);
        text += `${i + 1}. ${content}\n\n`;
      });
    }

    // Add translation words if present
    if (response.translationWords && Array.isArray(response.translationWords) && response.translationWords.length > 0) {
      text += '## Translation Words\n\n';
      response.translationWords.forEach((word: any) => {
        const term = word.term || word.name || 'Unknown Term';
        const definition = word.definition || word.content || 'No definition available';
        text += `**${term}**\n${definition}\n\n`;
      });
    }

    // Add translation questions if present
    if (response.translationQuestions && Array.isArray(response.translationQuestions) && response.translationQuestions.length > 0) {
      text += '## Translation Questions\n\n';
      response.translationQuestions.forEach((q: any, i: number) => {
        const question = q.Question || q.question || 'No question';
        const answer = q.Response || q.response || q.Answer || q.answer || 'No answer';
        text += `Q${i + 1}: ${question}\nA: ${answer}\n\n`;
      });
    }

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