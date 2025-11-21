# MCP Client Configuration Examples

This directory contains example configurations for various MCP clients.

## Claude Desktop

Claude Desktop uses a configuration file located at:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Basic Configuration

Use [`claude-desktop-config.json`](./claude-desktop-config.json) for a basic setup with all tools enabled:

```json
{
  "mcpServers": {
    "translation-helps": {
      "command": "npx",
      "args": ["js-translation-helps-proxy"]
    }
  }
}
```

### Filtered Configuration

Use [`claude-desktop-config-filtered.json`](./claude-desktop-config-filtered.json) for a filtered setup:

```json
{
  "mcpServers": {
    "translation-helps-filtered": {
      "command": "npx",
      "args": [
        "js-translation-helps-proxy",
        "--enabled-tools",
        "fetch_scripture,fetch_translation_notes,fetch_translation_questions",
        "--hide-params",
        "language,organization",
        "--filter-book-chapter-notes"
      ]
    }
  }
}
```

## Cline (VS Code Extension)

Cline uses MCP server configurations in VS Code settings. Use [`cline-config.json`](./cline-config.json):

```json
{
  "mcpServers": {
    "translation-helps": {
      "command": "npx",
      "args": ["js-translation-helps-proxy"],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

Add this to your VS Code settings (`.vscode/settings.json` or user settings):

```json
{
  "cline.mcpServers": {
    "translation-helps": {
      "command": "npx",
      "args": ["js-translation-helps-proxy"]
    }
  }
}
```

## Configuration Options

All configurations support the following command-line arguments:

- `--enabled-tools <tools>` - Comma-separated list of tools to enable
- `--hide-params <params>` - Comma-separated list of parameters to hide
- `--filter-book-chapter-notes` - Filter out book/chapter level notes
- `--log-level <level>` - Set logging level (debug, info, warn, error)

### Example with All Options

```json
{
  "mcpServers": {
    "translation-helps": {
      "command": "npx",
      "args": [
        "js-translation-helps-proxy",
        "--enabled-tools",
        "fetch_scripture,fetch_translation_notes",
        "--hide-params",
        "language,organization",
        "--filter-book-chapter-notes",
        "--log-level",
        "info"
      ]
    }
  }
}
```

## Testing Your Configuration

After adding the configuration, restart your MCP client and verify the server is running:

1. Check the client's MCP server status
2. Try using one of the translation tools
3. Check logs for any errors

For debugging, you can increase the log level:

```json
{
  "args": ["js-translation-helps-proxy", "--log-level", "debug"]
}
```

## Available Tools

To see all available tools, run:

```bash
# Run from npm (recommended)
npx js-translation-helps-proxy --list-tools

# Or from GitHub for latest development version:
# npx github:JEdward7777/js-translation-helps-proxy --list-tools
```

Common tools include:
- `fetch_scripture` - Fetch Bible scripture text
- `fetch_translation_notes` - Get translation notes for a verse
- `fetch_translation_questions` - Get translation questions
- `get_translation_word` - Get translation word definitions
- `browse_translation_words` - Browse translation words
- `get_context` - Get contextual information
- `extract_references` - Extract Bible references from text
- `get_system_prompt` - Get system prompt and constraints

## Troubleshooting

If the server doesn't start:

1. Ensure Node.js 20.17.0 or higher is installed
2. Try running manually: `npx js-translation-helps-proxy --help`
3. Check the client's error logs
4. Verify network connectivity to upstream server
5. Try with debug logging: `--log-level debug`

For more information, see the [main documentation](../docs/STDIO_SERVER.md).