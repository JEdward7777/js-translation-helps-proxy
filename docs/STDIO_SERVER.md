# stdio MCP Interface Documentation

The stdio MCP interface provides an **on-demand, client-launched process** for the Translation Helps Proxy, making it compatible with MCP clients like Claude Desktop and Cline. For web services, see [Interface 2 (MCP HTTP)](./MCP_SERVER.md). For LLM integration, see [Interface 4](./OPENAI_API.md) or [Interface 5](./LLM_HELPER.md).

**Key Characteristics:**
- ✅ **Launched on-demand** by the MCP client (not a persistent server)
- ✅ **No background processes** - runs only when the client needs it
- ✅ **Automatic lifecycle** - terminates when the client disconnects
- ✅ **stdio transport** - communicates via standard input/output with the parent process
- ✅ **Resource efficient** - no idle processes consuming memory or CPU

Unlike Interfaces 2 & 4 (which are persistent HTTP servers), this interface is a **process that the MCP client spawns** when it needs to use translation tools, and automatically terminates when done.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Command-Line Options](#command-line-options)
- [MCP Client Setup](#mcp-client-setup)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

## Installation

### Prerequisites

- Node.js 20.17.0 or higher
- npm or npx

### Install via npm

```bash
npm install -g js-translation-helps-proxy
```

### Use via npx (No Installation Required)

```bash
# Run from npm (recommended)
npx js-translation-helps-proxy --help

# Or directly from GitHub for latest development version:
# npx github:JEdward7777/js-translation-helps-proxy --help
```

## Quick Start

### 1. Test the Interface

You can test the interface manually (it will wait for MCP protocol messages on stdin):

```bash
# Show help
npx js-translation-helps-proxy --help

# List available tools
npx js-translation-helps-proxy --list-tools

# Test manually (for debugging - will wait for MCP messages on stdin)
npx js-translation-helps-proxy
```

**Note:** When run manually, the process waits for MCP protocol messages on stdin. In normal use, your MCP client (Claude Desktop, Cline) launches this process automatically when needed.

### 2. Configure Your MCP Client

Add to your MCP client configuration (e.g., Claude Desktop):

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

### 3. Restart Your MCP Client

Restart Claude Desktop or your MCP client to load the new configuration. The client will now **launch the process on-demand** when it needs to use translation tools.

## Configuration

### Basic Configuration

The simplest configuration enables all tools with default settings:

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

Enable only specific tools and hide certain parameters:

```json
{
  "mcpServers": {
    "translation-helps": {
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

## Command-Line Options

### `--enabled-tools <tools>`

Comma-separated list of tools to enable. By default, all tools are enabled.

**Example:**
```bash
npx js-translation-helps-proxy --enabled-tools "fetch_scripture,fetch_translation_notes"
```

**Available Tools:**
- `fetch_scripture` - Fetch Bible scripture text
- `fetch_translation_notes` - Get translation notes
- `fetch_translation_questions` - Get translation questions
- `get_translation_word` - Get translation word definitions
- `browse_translation_words` - Browse translation words
- `get_context` - Get contextual information
- `extract_references` - Extract Bible references from text
- `get_system_prompt` - Get system prompt and constraints
- And more (use `--list-tools` to see all)

### `--hide-params <params>`

Comma-separated list of parameters to hide from tool schemas. This simplifies the tool interface by removing optional parameters.

**Example:**
```bash
npx js-translation-helps-proxy --hide-params "language,organization"
```

**Common Parameters to Hide:**
- `language` - Language code (defaults to "en")
- `organization` - Organization name (defaults to "unfoldingWord")

### `--filter-book-chapter-notes`

Filter out book-level and chapter-level notes from translation notes responses, keeping only verse-specific notes.

**Example:**
```bash
npx js-translation-helps-proxy --filter-book-chapter-notes
```

### `--log-level <level>`

Set the logging level. Logs are written to stderr (not stdout, which is used for MCP protocol).

**Levels:** `debug`, `info`, `warn`, `error`

**Example:**
```bash
npx js-translation-helps-proxy --log-level debug
```

### `--list-tools`

List all available tools from the upstream server and exit.

**Example:**
```bash
npx js-translation-helps-proxy --list-tools
```

### `--help`, `-h`

Show help message with all available options.

**Example:**
```bash
npx js-translation-helps-proxy --help
```

## MCP Client Setup

**Important:** The MCP client (Claude Desktop, Cline, etc.) **launches this process on-demand** when it needs translation tools. You don't need to start or manage any server - the client handles the process lifecycle automatically.

### Claude Desktop

**Configuration File Locations:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Basic Setup:**

1. Open or create the configuration file
2. Add the server configuration:

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

3. Save the file
4. Restart Claude Desktop

**Verify Setup:**
- Open Claude Desktop
- Look for the MCP server indicator (Claude will launch the process when needed)
- Try asking: "What tools do you have available?" (this triggers the process launch)
- Test a tool: "Fetch John 3:16 scripture"
- The process runs in the background while Claude needs it, then terminates automatically

### Cline (VS Code Extension)

**Setup in VS Code Settings:**

1. Open VS Code settings (JSON)
2. Add the MCP server configuration:

```json
{
  "cline.mcpServers": {
    "translation-helps": {
      "command": "npx",
      "args": ["js-translation-helps-proxy"],
      "disabled": false
    }
  }
}
```

3. Reload VS Code
4. Open Cline and verify the configuration is loaded (Cline will launch the process when needed)

### Other MCP Clients

For other MCP clients that support stdio transport:

1. Use `npx js-translation-helps-proxy` as the command
2. Ensure the client can execute Node.js commands
3. Configure any client-specific options as needed

## Usage Examples

### Example 1: All Tools Enabled

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

**Use Case:** Full access to all translation helps tools.

### Example 2: Scripture and Notes Only

```json
{
  "mcpServers": {
    "translation-helps-scripture": {
      "command": "npx",
      "args": [
        "js-translation-helps-proxy",
        "--enabled-tools",
        "fetch_scripture,fetch_translation_notes"
      ]
    }
  }
}
```

**Use Case:** Simplified interface for scripture reading and notes.

### Example 3: Simplified Parameters

```json
{
  "mcpServers": {
    "translation-helps-simple": {
      "command": "npx",
      "args": [
        "js-translation-helps-proxy",
        "--hide-params",
        "language,organization"
      ]
    }
  }
}
```

**Use Case:** Hide language/organization parameters for English-only users.

### Example 4: Verse Notes Only

```json
{
  "mcpServers": {
    "translation-helps-verses": {
      "command": "npx",
      "args": [
        "js-translation-helps-proxy",
        "--enabled-tools",
        "fetch_translation_notes",
        "--filter-book-chapter-notes"
      ]
    }
  }
}
```

**Use Case:** Get only verse-specific translation notes, excluding book/chapter introductions.

### Example 5: Debug Mode

```json
{
  "mcpServers": {
    "translation-helps-debug": {
      "command": "npx",
      "args": [
        "js-translation-helps-proxy",
        "--log-level",
        "debug"
      ]
    }
  }
}
```

**Use Case:** Troubleshooting connection or tool issues.

## Troubleshooting

### Process Won't Launch

**Problem:** MCP client shows connection error or can't launch the process.

**Solutions:**

1. **Check Node.js version:**
   ```bash
   node --version  # Should be 20.17.0 or higher
   ```

2. **Test process manually:**
   ```bash
   npx js-translation-helps-proxy --help
   ```
   
   This verifies the process can be launched successfully.

3. **Check for errors:**
   ```bash
   npx js-translation-helps-proxy --log-level debug
   ```

4. **Verify npx is available:**
   ```bash
   which npx  # Unix/macOS
   where npx  # Windows
   ```

### Tools Not Appearing

**Problem:** MCP client doesn't show any tools.

**Solutions:**

1. **List tools manually:**
   ```bash
   npx js-translation-helps-proxy --list-tools
   ```

2. **Check enabled-tools filter:**
   - Remove `--enabled-tools` argument to enable all tools
   - Verify tool names are spelled correctly

3. **Check upstream connectivity:**
   - Ensure internet connection is available
   - Verify firewall isn't blocking connections

### Tool Calls Failing

**Problem:** Tool calls return errors or empty results.

**Solutions:**

1. **Enable debug logging:**
   ```json
   {
     "args": ["js-translation-helps-proxy", "--log-level", "debug"]
   }
   ```

2. **Check parameter requirements:**
   - Ensure required parameters are provided
   - Verify parameter formats (e.g., "John 3:16" for references)

3. **Test upstream server:**
   - Visit https://translation-helps-mcp.pages.dev/
   - Verify the upstream service is operational

### Performance Issues

**Problem:** Slow response times or timeouts.

**Solutions:**

1. **Check network connection:**
   - Ensure stable internet connection
   - Test upstream server response time

2. **Reduce tool count:**
   - Use `--enabled-tools` to limit available tools
   - This reduces initialization time

3. **Check client logs:**
   - Review MCP client logs for timeout settings
   - Increase timeout if configurable

### Configuration Not Loading

**Problem:** Changes to configuration don't take effect.

**Solutions:**

1. **Restart MCP client:**
   - Fully quit and restart the application
   - Don't just reload the window

2. **Verify configuration file location:**
   - Check you're editing the correct file
   - Ensure proper JSON syntax (use a validator)

3. **Check file permissions:**
   - Ensure the config file is readable
   - Verify no syntax errors in JSON

## Advanced Topics

### Custom Upstream URL

While not exposed as a command-line option, you can modify the source code to use a custom upstream URL:

```typescript
// In src/stdio-server/server.ts
this.client = new TranslationHelpsClient({
  upstreamUrl: 'https://your-custom-server.com/api/mcp',
  // ... other config
});
```

### Multiple Server Instances

You can run multiple instances with different configurations:

```json
{
  "mcpServers": {
    "translation-helps-full": {
      "command": "npx",
      "args": ["js-translation-helps-proxy"]
    },
    "translation-helps-simple": {
      "command": "npx",
      "args": [
        "js-translation-helps-proxy",
        "--enabled-tools",
        "fetch_scripture",
        "--hide-params",
        "language,organization"
      ]
    }
  }
}
```

### Environment Variables

The server respects standard Node.js environment variables:

- `NODE_OPTIONS` - Pass Node.js runtime options (e.g., `--max-old-space-size=4096`)

**Note:** The server uses command-line arguments for configuration (see [Command-Line Options](#command-line-options)), not environment variables like `NODE_ENV`.

### Logging

Logs are written to stderr to avoid interfering with the MCP protocol on stdout. To capture logs:

```bash
npx js-translation-helps-proxy 2> server.log
```

### Building from Source

If you want to modify the server:

```bash
# Clone the repository
git clone https://github.com/JEdward7777/js-translation-helps-proxy.git
cd js-translation-helps-proxy

# Install dependencies
npm install

# Build
npm run build

# Run locally
node dist/stdio-server/index.js
```

## See Also

- **[MCP HTTP Server](./MCP_SERVER.md)** - Interface 2 for web services with client-controlled filters
- **[OpenAI API](./OPENAI_API.md)** - Interface 4 for REST API with automatic tool execution
- **[LLM Helper](./LLM_HELPER.md)** - Interface 5 for TypeScript LLM integration
- [Main README](../README.md) - Project overview
- [Architecture Documentation](../ARCHITECTURE.md) - Technical details
- [Example Configurations](../examples/README.md) - More configuration examples

## Support

For issues, questions, or contributions:

- GitHub Issues: https://github.com/JEdward7777/js-translation-helps-proxy/issues
- Documentation: https://github.com/JEdward7777/js-translation-helps-proxy/docs

## License

See [LICENSE](../LICENSE) file for details.