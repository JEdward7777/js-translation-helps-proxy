# Deployment Guide

This guide covers deploying the JS Translation Helps Proxy to CloudFlare Workers and other environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [CloudFlare Workers Deployment](#cloudflare-workers-deployment)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Deployment Checklist](#deployment-checklist)
- [Monitoring and Logs](#monitoring-and-logs)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required

- **Node.js** >= 20.17.0
- **npm** or **yarn**
- **CloudFlare Account** (free tier works)
- **Wrangler CLI** (installed via npm)

### Optional

- **Git** for version control
- **CloudFlare Workers KV** for caching (future feature)

---

## CloudFlare Workers Deployment

### Step 1: Install Dependencies

```bash
cd js-translation-helps-proxy
npm install
```

### Step 2: Configure Wrangler

The project includes a pre-configured `wrangler.toml` file. Only `UPSTREAM_URL` is required; other variables have sensible defaults:

```toml
name = "js-translation-helps-proxy"
main = "dist/esm/openai-api/index.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[vars]
# REQUIRED: Upstream Translation Helps API endpoint
UPSTREAM_URL = "https://translation-helps-mcp.pages.dev/api/mcp"

# OPTIONAL: Override defaults (uncomment to customize)
# LOG_LEVEL = "info"                    # Default: "info"
# TIMEOUT = "30000"                     # Default: 30000ms
# OPENAI_FILTER_NOTES = "true"          # Default: true
# OPENAI_MAX_ITERATIONS = "5"           # Default: 5
```

### Step 3: Authenticate with CloudFlare

```bash
npx wrangler login
```

This will open a browser window for authentication.

### Step 4: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in dual formats:
- `dist/cjs/` - CommonJS modules (for `require()`)
- `dist/esm/` - ES modules (for `import`)

The CloudFlare Workers deployment uses the ESM build (`dist/esm/`).

### Step 5: Test Locally

You can test locally using either Wrangler (CloudFlare Workers runtime) or Native Node.js:

**Option A: Using Wrangler (CloudFlare Workers runtime)**
```bash
npm run dev:http
```

**Option B: Using Native Node.js (better for debugging)**
```bash
npm run dev:node
```

Both options start the server at `http://localhost:8787`. Test the endpoints:

```bash
# Health check
curl http://localhost:8787/health

# List models (OpenAI API - requires API key)
curl -H "Authorization: Bearer sk-YOUR-OPENAI-KEY" \
  http://localhost:8787/v1/models

# MCP server info
curl http://localhost:8787/mcp/info
```

### Step 6: Deploy to CloudFlare Workers

```bash
npm run deploy
```

Or for production environment:

```bash
npm run deploy:production
```

### Step 7: Verify Deployment

After deployment, Wrangler will output your worker URL:

```
Published js-translation-helps-proxy (X.XX sec)
  https://js-translation-helps-proxy.your-subdomain.workers.dev
```

Test the deployed endpoints:

```bash
# Replace with your actual worker URL
WORKER_URL="https://js-translation-helps-proxy.your-subdomain.workers.dev"

# Health check
curl $WORKER_URL/health

# Test OpenAI API (requires your OpenAI API key)
curl -X POST $WORKER_URL/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-YOUR-OPENAI-KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Fetch John 3:16"}]
  }'
```

---

## Local Development

### Development Server

You have three options for local development:

**Option 1: Wrangler (CloudFlare Workers runtime)**
```bash
# Start development server with hot reload
npm run dev:http

# Or use wrangler directly
npx wrangler dev
```

**Option 2: Native Node.js (better for debugging)**
```bash
# Start development server with hot reload and debugging support
npm run dev:node
```

**Option 3: stdio Server (for MCP clients)**
```bash
# Start stdio server for Claude Desktop/Cline
npm run dev
```

### Development with stdio Server

```bash
# Start stdio server for Claude Desktop/Cline
npm run start:stdio

# Or with tsx for hot reload
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode for development
npm run test:watch
```

### Debugging with VSCode

The project includes VSCode launch configurations for debugging. To debug:

1. **Set breakpoints** in your code by clicking in the gutter next to line numbers
2. **Open the Run and Debug panel** (Ctrl+Shift+D or Cmd+Shift+D)
3. **Select a debug configuration:**
   - `Debug HTTP Server - Native Node.js (Interfaces 2 & 4)` - Debug MCP HTTP/SSE and OpenAI API servers with hot reload
   - `Debug HTTP Server - Built (Interfaces 2 & 4)` - Debug compiled HTTP servers
   - `Debug stdio Server (Interface 3)` - Debug stdio MCP server (uses standard input/output, not HTTP)
   - `Debug Current Test File` - Debug the currently open test file
4. **Press F5** or click the green play button to start debugging

The debugger will:
- Stop at your breakpoints
- Allow you to inspect variables
- Step through code execution
- View call stacks
- Evaluate expressions in the debug console

**Example debugging workflow for HTTP servers (Interfaces 2 & 4):**
```bash
# 1. Open src/openai-api/start-node.ts or src/mcp-server/routes.ts
# 2. Set a breakpoint in the code you want to debug
# 3. Press F5 and select "Debug HTTP Server - Native Node.js (Interfaces 2 & 4)"
# 4. The server starts at http://localhost:8787
# 5. Make a request to trigger your breakpoint:
curl http://localhost:8787/v1/models
# 6. The debugger will stop at your breakpoint
# 7. Use the debug toolbar to step through code
```

**Example debugging workflow for stdio server (Interface 3):**
```bash
# 1. Open src/stdio-server/index.ts
# 2. Set a breakpoint in the code you want to debug
# 3. Press F5 and select "Debug stdio Server (Interface 3)"
# 4. The server communicates via standard input/output (not HTTP)
# 5. Test with an MCP client like Claude Desktop or send JSON-RPC messages via stdin
```

**Important Notes:**
- **Interface 3 (stdio)** uses standard input/output for communication, NOT HTTP/REST
- **Interfaces 2 & 4** are HTTP/REST servers (MCP HTTP and OpenAI API)
- The Native Node.js server (`npm run dev:node`) is recommended for debugging HTTP servers as it provides better source map support and faster reload times than Wrangler

---

## Environment Variables

### CloudFlare Workers (wrangler.toml)

Environment variables for CloudFlare Workers are configured in `wrangler.toml`. **Most variables are optional** as the code provides sensible defaults.

**Required Variables:**
- `UPSTREAM_URL` - The upstream Translation Helps API endpoint

**Optional Variables (with defaults):**
- `LOG_LEVEL` - Logging level (default: `"info"`, options: `debug`, `info`, `warn`, `error`)
- `TIMEOUT` - Request timeout in milliseconds (default: `30000`)
- `OPENAI_FILTER_NOTES` - Filter book/chapter notes (default: `true`)
- `OPENAI_MAX_ITERATIONS` - Max tool call iterations (default: `5`)
- `OPENAI_ENABLED_TOOLS` - Comma-separated list of enabled tools (default for Interface 4: `"fetch_translation_notes"`)
- `OPENAI_HIDDEN_PARAMS` - Comma-separated list of hidden parameters (default for Interface 4: `"language,organization"`)

**Important:** Interface 4 (OpenAI API) has **opinionated defaults** to provide a simplified experience:
- Only `fetch_translation_notes` tool is enabled by default
- `language` and `organization` parameters are hidden by default (hardcoded to `en` and `unfoldingWord`)
- To enable all tools, set `OPENAI_ENABLED_TOOLS=""` (empty string)
- To show all parameters, set `OPENAI_HIDDEN_PARAMS=""` (empty string)

Interface 2 (MCP HTTP) does not have these defaults and exposes all tools/parameters unless explicitly configured.

Example configuration:

```toml
[vars]
# Required
UPSTREAM_URL = "https://translation-helps-mcp.pages.dev/api/mcp"

# Optional overrides
LOG_LEVEL = "info"
TIMEOUT = "30000"
OPENAI_FILTER_NOTES = "true"
OPENAI_MAX_ITERATIONS = "5"
```

**Important:** CloudFlare Workers does NOT inherit `[vars]` from the top level to environment-specific configurations. Each environment must define its own complete set of variables.

### Local Development (.env)

For local development with Node.js, create a `.env` file (already in `.gitignore`):

```bash
# .env file (DO NOT COMMIT)

# Required
UPSTREAM_URL=https://translation-helps-mcp.pages.dev/api/mcp

# Optional overrides
LOG_LEVEL=debug
TIMEOUT=30000
OPENAI_FILTER_NOTES=true
OPENAI_MAX_ITERATIONS=5

# For LLM Helper tests (optional)
OPENAI_API_KEY=your-openai-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here
```

### Environment-Specific Configuration

The `wrangler.toml` defines separate worker instances for different environments:

```toml
# Development environment - separate worker with debug logging
[env.development]
name = "js-translation-helps-proxy-dev"
vars = {
  UPSTREAM_URL = "https://translation-helps-mcp.pages.dev/api/mcp",
  LOG_LEVEL = "debug"
}

# Production environment - separate worker with info logging
[env.production]
name = "js-translation-helps-proxy-prod"
vars = {
  UPSTREAM_URL = "https://translation-helps-mcp.pages.dev/api/mcp",
  LOG_LEVEL = "info"
}
```

Deploy to specific environment:

```bash
# Development (creates js-translation-helps-proxy-dev worker)
npx wrangler deploy --env development

# Production (creates js-translation-helps-proxy-prod worker)
npx wrangler deploy --env production

# Default (uses top-level name: js-translation-helps-proxy)
npx wrangler deploy
```

Each environment creates a **separate CloudFlare Worker** with its own URL and configuration.

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (`npm test`)
- [ ] Code linted (`npm run lint`)
- [ ] Build successful (`npm run build`)
- [ ] Local testing complete (`npm run dev:http`)
- [ ] Environment variables configured
- [ ] `wrangler.toml` reviewed and updated
- [ ] Version number updated in `package.json`

### Deployment

Before deploying to production, always deploy to a staging/preview environment first to verify everything works correctly.

#### Step 1: Authenticate with CloudFlare

```bash
npx wrangler login
```

This opens a browser window for authentication. Verify you're logged in:

```bash
npx wrangler whoami
```

#### Step 2: Deploy to Staging/Preview First

CloudFlare Workers supports multiple deployment strategies for testing before production:

**Option A: Deploy to Development Environment**

```bash
# Deploy to development environment (uses env.development config from wrangler.toml)
npx wrangler deploy --env development
```

This deploys with `LOG_LEVEL = "debug"` and creates a separate worker instance for testing.

**Option B: Deploy with a Custom Name (Preview)**

```bash
# Deploy with a custom name for preview/testing
npx wrangler deploy --name js-translation-helps-proxy-preview
```

This creates a completely separate worker with a different URL for testing.

**Option C: Use Wrangler's Built-in Preview**

```bash
# Deploy to a temporary preview environment
npx wrangler deploy --dry-run
```

This validates the deployment without actually publishing.

#### Step 3: Test Deployed Staging/Preview Endpoints

After deploying to staging, Wrangler outputs the worker URL. Test all endpoints:

```bash
# Set your staging/preview URL
STAGING_URL="https://js-translation-helps-proxy-development.your-subdomain.workers.dev"

# Test health endpoint
curl $STAGING_URL/health

# Test OpenAI API (requires your OpenAI API key)
curl -X POST $STAGING_URL/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-YOUR-OPENAI-KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Fetch John 3:16"}]
  }'

# Test MCP HTTP endpoints
curl $STAGING_URL/mcp/info

# Test MCP tools list
curl -X POST $STAGING_URL/mcp/tools/list \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Step 4: Verify All Interfaces Work

- [ ] Health endpoint (`/health`) returns 200 OK
- [ ] OpenAI API (`/v1/chat/completions`) processes requests correctly
- [ ] MCP HTTP endpoints (`/mcp/*`) respond properly
- [ ] Check CloudFlare Workers dashboard for errors
- [ ] Monitor initial requests and response times

#### Step 5: Deploy to Production

Once staging tests pass, deploy to production:

```bash
# Deploy to production environment
npx wrangler deploy --env production

# Or use the npm script
npm run deploy:production
```

For the default production deployment (no environment specified):

```bash
# Deploy to default production
npm run deploy
```

#### Step 6: Verify Production Deployment

```bash
# Set your production URL
PROD_URL="https://js-translation-helps-proxy.your-subdomain.workers.dev"

# Quick health check
curl $PROD_URL/health

# Test a simple request
curl -X POST $PROD_URL/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-YOUR-OPENAI-KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

#### Step 7: Monitor Initial Production Requests

```bash
# Tail production logs in real-time
npx wrangler tail --env production

# Or for default production
npx wrangler tail
```

Watch for:
- Error rates
- Response times
- Unexpected behavior
- Resource usage

**Deployment Checklist:**

- [ ] Authenticate with CloudFlare (`npx wrangler login`)
- [ ] Deploy to staging/preview first (`npx wrangler deploy --env development`)
- [ ] Test all staging endpoints thoroughly
- [ ] Verify all interfaces work in staging
- [ ] Check CloudFlare Workers dashboard for staging metrics
- [ ] Deploy to production (`npx wrangler deploy --env production`)
- [ ] Verify production endpoints
- [ ] Monitor initial production requests

### Post-Deployment

- [ ] Verify production endpoints
- [ ] Check error rates in CloudFlare dashboard
- [ ] Monitor performance metrics
- [ ] Update documentation if needed
- [ ] Tag release in Git
- [ ] Notify team/users of deployment

---

## Monitoring and Logs

### CloudFlare Workers Dashboard

1. Go to [CloudFlare Workers Dashboard](https://dash.cloudflare.com/)
2. Select your worker
3. View metrics:
   - Requests per second
   - Error rate
   - CPU time
   - Duration

### Real-Time Logs

```bash
# Tail logs in real-time
npx wrangler tail

# Filter by status
npx wrangler tail --status error

# Filter by method
npx wrangler tail --method POST
```

### Log Levels

The proxy uses structured logging with levels:

- **ERROR**: Critical errors
- **WARN**: Warnings
- **INFO**: General information (default in production)
- **DEBUG**: Detailed debugging (use in development)

Set log level in `wrangler.toml`:

```toml
[vars]
LOG_LEVEL = "info"  # or "debug", "warn", "error"
```

---

## Troubleshooting

### Build Errors

**Problem:** TypeScript compilation errors

```bash
npm run build
# Check for TypeScript errors
```

**Solution:**
- Fix TypeScript errors in source code
- Ensure `tsconfig.json` is correct
- Check for missing dependencies

### Deployment Errors

**Problem:** Wrangler deployment fails

```bash
npx wrangler deploy
# Error: Authentication required
```

**Solution:**
```bash
npx wrangler login
npx wrangler whoami  # Verify authentication
```

### Runtime Errors

**Problem:** Worker returns 500 errors

**Solution:**
1. Check CloudFlare Workers logs:
   ```bash
   npx wrangler tail
   ```

2. Verify environment variables in `wrangler.toml`

3. Test locally first:
   ```bash
   npm run dev:http
   ```

### Upstream Connection Errors

**Problem:** Cannot connect to upstream MCP server

**Solution:**
1. Verify `UPSTREAM_URL` in `wrangler.toml`
2. Test upstream server directly:
   ```bash
   curl https://translation-helps-mcp.pages.dev/api/mcp
   ```
3. Check network/firewall settings

### Performance Issues

**Problem:** Slow response times

**Solution:**
1. Check CloudFlare Workers metrics
2. Increase timeout if needed:
   ```toml
   [vars]
   TIMEOUT = "60000"  # 60 seconds
   ```
3. Consider implementing caching (future feature)

---

## Rollback Procedures

### Quick Rollback

CloudFlare Workers keeps previous versions. To rollback:

1. Go to CloudFlare Workers Dashboard
2. Select your worker
3. Click "Deployments" tab
4. Find previous working version
5. Click "Rollback" button

### Manual Rollback

```bash
# Deploy specific version from Git
git checkout v0.0.9  # Previous version
npm run build
npm run deploy
```

### Emergency Rollback

If the worker is completely broken:

1. **Disable the worker** in CloudFlare dashboard
2. **Fix the issue** locally
3. **Test thoroughly**
4. **Redeploy**

---

## Advanced Deployment

### Custom Domain

1. Add custom domain in CloudFlare Workers dashboard
2. Update DNS records
3. Configure SSL/TLS

### Multiple Environments

```toml
# wrangler.toml

# Staging environment
[env.staging]
name = "js-translation-helps-proxy-staging"
vars = {
  UPSTREAM_URL = "https://translation-helps-mcp.pages.dev/api/mcp",
  LOG_LEVEL = "debug"
}

# Production environment
[env.production]
name = "js-translation-helps-proxy-production"
vars = {
  UPSTREAM_URL = "https://translation-helps-mcp.pages.dev/api/mcp",
  LOG_LEVEL = "info"
}
```

Deploy to specific environment:

```bash
npx wrangler deploy --env staging
npx wrangler deploy --env production
```

**Note:** Each environment must include `UPSTREAM_URL` as it's required and not inherited from the top level.

### CI/CD Integration

#### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to CloudFlare Workers

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to CloudFlare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: deploy --env production
```

### Secrets Management

For sensitive data like API keys:

**Note:** Interface 4 (OpenAI API) uses the client's API key from the `Authorization` header, not a server-side key. The proxy passes the client's key to OpenAI.

If you need to store other secrets:

```bash
# Set secret in CloudFlare Workers
npx wrangler secret put MY_SECRET_KEY

# List secrets
npx wrangler secret list

# Delete secret
npx wrangler secret delete MY_SECRET_KEY
```

Access secrets in code:

```typescript
// In CloudFlare Workers environment
const secretKey = env.MY_SECRET_KEY;
```

---

## Performance Optimization

### Caching Strategy

Future feature: Implement KV caching for tool lists

```toml
[[kv_namespaces]]
binding = "TRANSLATION_CACHE"
id = "your_kv_namespace_id"
```

### Request Optimization

- Keep tool list cached
- Minimize upstream requests
- Use streaming for large responses

### Resource Limits

CloudFlare Workers limits:
- **CPU Time:** 50ms (free), 50ms-30s (paid)
- **Memory:** 128MB
- **Request Size:** 100MB
- **Response Size:** Unlimited (streaming)

---

## Security Considerations

### API Key Protection

- Never commit API keys to Git
- Use CloudFlare Workers secrets for sensitive data
- Rotate keys regularly

### Rate Limiting

Consider implementing rate limiting for production:

```typescript
// Example rate limiting logic
const rateLimiter = new RateLimiter({
  limit: 100,
  window: 60000 // 1 minute
});
```

### CORS Configuration

Configure CORS in production:

```typescript
// Add CORS headers
response.headers.set('Access-Control-Allow-Origin', '*');
response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
```

---

## Cost Estimation

### CloudFlare Workers Pricing

**Free Tier:**
- 100,000 requests/day
- 10ms CPU time per request

**Paid Plan ($5/month):**
- 10 million requests/month included
- $0.50 per additional million requests
- 50ms CPU time per request

### Estimated Costs

For typical usage:
- **Low traffic** (< 100k requests/day): **Free**
- **Medium traffic** (1M requests/month): **$5/month**
- **High traffic** (10M requests/month): **$5/month**

---

## Support and Resources

- **CloudFlare Workers Docs:** https://developers.cloudflare.com/workers/
- **Wrangler CLI Docs:** https://developers.cloudflare.com/workers/wrangler/
- **Project Issues:** GitHub Issues
- **Community:** GitHub Discussions

---

**Last Updated:** 2025-11-11  
**Version:** 0.1.0