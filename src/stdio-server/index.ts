#!/usr/bin/env node
/**
 * Entry point for stdio MCP server
 * Executable via: npx github:JEdward7777/js-translation-helps-proxy
 * Or when published: npx js-translation-helps-proxy
 */

import { StdioMCPServer } from './server.js';
import { logger } from '../shared/index.js';

interface CLIArgs {
  enabledTools?: string[];
  hiddenParams?: string[];
  filterBookChapterNotes?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  listTools?: boolean;
  help?: boolean;
}

/**
 * Parse command-line arguments
 */
function parseArgs(): CLIArgs {
  const args: CLIArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--enabled-tools':
        if (i + 1 < argv.length) {
          args.enabledTools = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
        }
        break;

      case '--hide-params':
        if (i + 1 < argv.length) {
          args.hiddenParams = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
        }
        break;

      case '--filter-book-chapter-notes':
        args.filterBookChapterNotes = true;
        break;

      case '--log-level':
        if (i + 1 < argv.length) {
          const level = argv[++i];
          if (['debug', 'info', 'warn', 'error'].includes(level)) {
            args.logLevel = level as 'debug' | 'info' | 'warn' | 'error';
          } else {
            console.error(`Invalid log level: ${level}. Using 'info'.`);
            args.logLevel = 'info';
          }
        }
        break;

      case '--list-tools':
        args.listTools = true;
        break;

      case '--help':
      case '-h':
        args.help = true;
        break;

      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return args;
}

/**
 * Display help message
 */
function showHelp(): void {
  console.log(`
js-translation-helps-proxy - MCP Server for Translation Helps

USAGE:
  npx github:JEdward7777/js-translation-helps-proxy [OPTIONS]
  Or when published: npx js-translation-helps-proxy [OPTIONS]

OPTIONS:
  --enabled-tools <tools>           Comma-separated list of tools to enable
                                    (default: all tools enabled)
                                    Example: --enabled-tools "fetch_scripture,fetch_translation_notes"

  --hide-params <params>            Comma-separated list of parameters to hide from tool schemas
                                    Example: --hide-params "language,organization"

  --filter-book-chapter-notes       Filter out book-level and chapter-level notes from
                                    translation notes responses

  --log-level <level>               Set logging level: debug, info, warn, error
                                    (default: info)

  --list-tools                      List all available tools and exit

  --help, -h                        Show this help message

EXAMPLES:
  # Start server with all tools (from GitHub)
  npx github:JEdward7777/js-translation-helps-proxy

  # Or when published to npm:
  # npx js-translation-helps-proxy

  # Start with only specific tools enabled
  npx github:JEdward7777/js-translation-helps-proxy --enabled-tools "fetch_scripture,fetch_translation_notes"
  # Or: npx js-translation-helps-proxy --enabled-tools "fetch_scripture,fetch_translation_notes"

  # Hide language and organization parameters
  npx github:JEdward7777/js-translation-helps-proxy --hide-params "language,organization"
  # Or: npx js-translation-helps-proxy --hide-params "language,organization"

  # Enable debug logging
  npx github:JEdward7777/js-translation-helps-proxy --log-level debug
  # Or: npx js-translation-helps-proxy --log-level debug

  # Filter out book/chapter notes
  npx github:JEdward7777/js-translation-helps-proxy --filter-book-chapter-notes
  # Or: npx js-translation-helps-proxy --filter-book-chapter-notes

  # List available tools
  npx github:JEdward7777/js-translation-helps-proxy --list-tools
  # Or: npx js-translation-helps-proxy --list-tools

MCP CLIENT CONFIGURATION:
  For Claude Desktop, add to your config file:
  {
    "mcpServers": {
      "translation-helps": {
        "command": "npx",
        "args": ["github:JEdward7777/js-translation-helps-proxy"]
      }
    }
  }

  Or when published to npm:
  {
    "mcpServers": {
      "translation-helps": {
        "command": "npx",
        "args": ["js-translation-helps-proxy"]
      }
    }
  }

  For Cline (VS Code extension), add similar configuration in settings.

MORE INFO:
  GitHub: https://github.com/JEdward7777/js-translation-helps-proxy
  Documentation: See README.md and docs/STDIO_SERVER.md
`);
}

/**
 * List available tools and exit
 */
async function listTools(): Promise<void> {
  try {
    console.log('📋 Discovering available tools from upstream server...\n');

    const server = new StdioMCPServer({ logLevel: 'error' });
    
    // Test connection first
    const connected = await server.testConnection();
    if (!connected) {
      console.error('❌ Unable to connect to upstream server');
      process.exit(1);
    }

    // Get tools through the client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing internal client
    const tools = await (server as any).client.listTools();

    console.log(`✅ Found ${tools.length} available tools:\n`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic tool format
    tools.forEach((tool: any, index: number) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${tool.name.padEnd(30)} - ${tool.description}`);
    });

    console.log('\n💡 Usage: --enabled-tools "tool1,tool2,tool3"');
    console.log('   Example: --enabled-tools "fetch_scripture,fetch_translation_notes"');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error discovering tools:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = parseArgs();

  // Handle help
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Handle list-tools
  if (args.listTools) {
    await listTools();
    return;
  }

  // Set default log level if not specified
  if (!args.logLevel) {
    args.logLevel = 'info';
  }

  // Log configuration to stderr (stdout is used for MCP protocol)
  if (args.logLevel === 'debug' || args.logLevel === 'info') {
    console.error('🚀 Starting js-translation-helps-proxy MCP server');
    if (args.enabledTools) {
      console.error(`   Enabled tools: ${args.enabledTools.join(', ')}`);
    }
    if (args.hiddenParams) {
      console.error(`   Hidden params: ${args.hiddenParams.join(', ')}`);
    }
    if (args.filterBookChapterNotes) {
      console.error('   Book/chapter note filtering: enabled');
    }
    console.error(`   Log level: ${args.logLevel}`);
    console.error('');
  }

  try {
    // Create and start the server
    const server = new StdioMCPServer({
      enabledTools: args.enabledTools,
      hiddenParams: args.hiddenParams,
      filterBookChapterNotes: args.filterBookChapterNotes,
      logLevel: args.logLevel,
    });

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      try {
        await server.close();
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Start the server
    await server.start();

    // Keep the process running
    // The server will handle stdio communication
  } catch (error) {
    logger.error('Fatal error starting server', error);
    console.error('❌ Failed to start server:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});