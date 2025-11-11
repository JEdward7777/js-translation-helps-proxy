/**
 * Unit tests for FilterEngine
 */

import { describe, it, expect } from 'vitest';
import { FilterEngine } from '../../../src/core/filter-engine.js';
import { Tool } from '../../../src/core/types.js';

describe('FilterEngine', () => {
  const mockTools: Tool[] = [
    {
      name: 'fetch_scripture',
      description: 'Fetch scripture',
      inputSchema: {
        type: 'object',
        properties: {
          reference: { type: 'string' },
          language: { type: 'string' },
          organization: { type: 'string' }
        },
        required: ['reference']
      }
    },
    {
      name: 'fetch_translation_notes',
      description: 'Fetch notes',
      inputSchema: {
        type: 'object',
        properties: {
          reference: { type: 'string' },
          language: { type: 'string' },
          organization: { type: 'string' }
        },
        required: ['reference']
      }
    },
    {
      name: 'get_system_prompt',
      description: 'Get system prompt',
      inputSchema: {
        type: 'object',
        properties: {
          includeImplementationDetails: { type: 'boolean' }
        },
        required: []
      }
    }
  ];

  describe('tool filtering', () => {
    it('should return all tools when no filter is specified', () => {
      const filter = new FilterEngine({});
      const filtered = filter.filterTools(mockTools);
      expect(filtered).toHaveLength(3);
      expect(filtered.map(t => t.name)).toEqual(['fetch_scripture', 'fetch_translation_notes', 'get_system_prompt']);
    });

    it('should filter tools by enabled list', () => {
      const filter = new FilterEngine({ enabledTools: ['fetch_scripture', 'get_system_prompt'] });
      const filtered = filter.filterTools(mockTools);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(t => t.name)).toEqual(['fetch_scripture', 'get_system_prompt']);
    });

    it('should return all tools when enabledTools is empty array', () => {
      const filter = new FilterEngine({ enabledTools: [] });
      const filtered = filter.filterTools(mockTools);
      expect(filtered).toHaveLength(3); // Empty array means no filtering
    });

    it('should handle non-existent tool names gracefully', () => {
      const filter = new FilterEngine({ enabledTools: ['non_existent_tool'] });
      const filtered = filter.filterTools(mockTools);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('parameter hiding', () => {
    it('should remove hidden parameters from tool schema', () => {
      const filter = new FilterEngine({ hiddenParams: ['language', 'organization'] });
      const tool = mockTools[0]; // fetch_scripture

      const filtered = filter.filterParameters(tool);

      expect(filtered.inputSchema.properties).toHaveProperty('reference');
      expect(filtered.inputSchema.properties).not.toHaveProperty('language');
      expect(filtered.inputSchema.properties).not.toHaveProperty('organization');
      expect(filtered.inputSchema.required).toEqual(['reference']);
    });

    it('should remove hidden parameters from required list', () => {
      const filter = new FilterEngine({ hiddenParams: ['language'] });
      const tool = mockTools[0]; // fetch_scripture

      const filtered = filter.filterParameters(tool);

      expect(filtered.inputSchema.properties).toHaveProperty('reference');
      expect(filtered.inputSchema.properties).toHaveProperty('organization');
      expect(filtered.inputSchema.properties).not.toHaveProperty('language');
      expect(filtered.inputSchema.required).toEqual(['reference']);
    });

    it('should not modify schema when no hidden params', () => {
      const filter = new FilterEngine({});
      const tool = mockTools[0];

      const filtered = filter.filterParameters(tool);

      expect(filtered).toEqual(tool);
    });

    it('should handle tools with no properties', () => {
      const filter = new FilterEngine({ hiddenParams: ['language'] });
      const tool: Tool = {
        name: 'test',
        description: 'test',
        inputSchema: { type: 'object', properties: {}, required: [] }
      };

      const filtered = filter.filterParameters(tool);
      expect(filtered.inputSchema.properties).toEqual({});
    });
  });

  describe('book/chapter note filtering', () => {
    it('should not filter when disabled', () => {
      const filter = new FilterEngine({ filterBookChapterNotes: false });
      const response = {
        items: [
          { Reference: 'front:intro', Note: 'Book intro' },
          { Reference: '3:16', Note: 'Verse note' }
        ]
      };

      const filtered = filter.filterBookChapterNotes(response);
      expect(filtered.items).toHaveLength(2);
    });

    it('should filter out book-level notes (front:intro)', () => {
      const filter = new FilterEngine({ filterBookChapterNotes: true });
      const response = {
        items: [
          { Reference: 'front:intro', Note: 'Book intro' },
          { Reference: '3:16', Note: 'Verse note' }
        ],
        metadata: { totalCount: 2 }
      };

      const filtered = filter.filterBookChapterNotes(response);

      expect(filtered.items).toHaveLength(1);
      expect(filtered.items[0].Reference).toBe('3:16');
      expect(filtered.metadata.totalCount).toBe(1);
    });

    it('should filter out chapter-level notes (ending with :intro)', () => {
      const filter = new FilterEngine({ filterBookChapterNotes: true });
      const response = {
        items: [
          { Reference: '3:intro', Note: 'Chapter intro' },
          { Reference: '3:16', Note: 'Verse note' },
          { Reference: '4:intro', Note: 'Another chapter intro' }
        ],
        metadata: { totalCount: 3 }
      };

      const filtered = filter.filterBookChapterNotes(response);

      expect(filtered.items).toHaveLength(1);
      expect(filtered.items[0].Reference).toBe('3:16');
      expect(filtered.metadata.totalCount).toBe(1);
    });

    it('should filter both book and chapter notes', () => {
      const filter = new FilterEngine({ filterBookChapterNotes: true });
      const response = {
        items: [
          { Reference: 'front:intro', Note: 'Book intro' },
          { Reference: '1:intro', Note: 'Chapter 1 intro' },
          { Reference: '3:16', Note: 'Verse note' },
          { Reference: '5:intro', Note: 'Chapter 5 intro' }
        ],
        metadata: { totalCount: 4 }
      };

      const filtered = filter.filterBookChapterNotes(response);

      expect(filtered.items).toHaveLength(1);
      expect(filtered.items[0].Reference).toBe('3:16');
      expect(filtered.metadata.totalCount).toBe(1);
    });

    it('should not modify response without items', () => {
      const filter = new FilterEngine({ filterBookChapterNotes: true });
      const response = { result: 'no items here' };

      const filtered = filter.filterBookChapterNotes(response);
      expect(filtered).toEqual(response);
    });

    it('should handle missing metadata', () => {
      const filter = new FilterEngine({ filterBookChapterNotes: true });
      const response = {
        items: [
          { Reference: 'front:intro', Note: 'Book intro' },
          { Reference: '3:16', Note: 'Verse note' }
        ]
      };

      const filtered = filter.filterBookChapterNotes(response);

      expect(filtered.items).toHaveLength(1);
      expect(filtered).not.toHaveProperty('metadata');
    });
  });

  describe('isToolEnabled', () => {
    it('should return true for all tools when no filter', () => {
      const filter = new FilterEngine({});
      expect(filter.isToolEnabled('any_tool')).toBe(true);
    });

    it('should return true for enabled tools', () => {
      const filter = new FilterEngine({ enabledTools: ['tool1', 'tool2'] });
      expect(filter.isToolEnabled('tool1')).toBe(true);
      expect(filter.isToolEnabled('tool2')).toBe(true);
    });

    it('should return false for disabled tools', () => {
      const filter = new FilterEngine({ enabledTools: ['tool1'] });
      expect(filter.isToolEnabled('tool2')).toBe(false);
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const filter = new FilterEngine({ enabledTools: ['tool1'] });
      expect(filter.isToolEnabled('tool2')).toBe(false);

      filter.updateConfig({ enabledTools: ['tool1', 'tool2'] });
      expect(filter.isToolEnabled('tool2')).toBe(true);
    });

    it('should return current configuration', () => {
      const config = { enabledTools: ['tool1'], filterBookChapterNotes: true };
      const filter = new FilterEngine(config);
      expect(filter.getConfig()).toEqual(config);
    });
  });
});