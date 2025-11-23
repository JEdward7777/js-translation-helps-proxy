# Upstream Response Reference Files

This directory contains real responses from the upstream Translation Helps API, captured for testing and validation purposes.

## Files

- `fetch_scripture.json` - Response for fetch_scripture
- `fetch_translation_notes.json` - Response for fetch_translation_notes
- `fetch_translation_questions.json` - Response for fetch_translation_questions
- `get_translation_word.json` - Response for get_translation_word
- `browse_translation_words.json` - Response for browse_translation_words
- `get_context.json` - Response for get_context
- `extract_references.json` - Response for extract_references

## Purpose

These files serve as:
1. **Ground truth** for actual upstream response formats
2. **Test fixtures** for unit and integration tests
3. **Documentation** of API behavior
4. **Change detection** - can diff when upstream API updates

## Updating

To refresh these files with current upstream responses:

```bash
npx tsx scripts/fetch-upstream-responses.ts
```

## File Format

Each file contains:
- `tool` - The tool name
- `timestamp` - When the response was captured
- `request` - The parameters used
- `response` - The actual upstream response

## Last Updated

2025-11-14T22:19:31.095Z

## Results

- ✓ fetch_scripture
- ✓ fetch_translation_notes
- ✓ fetch_translation_questions
- ✓ get_translation_word
- ✗ browse_translation_words - HTTP 500: Internal Server Error
- ✓ get_context
- ✓ extract_references
