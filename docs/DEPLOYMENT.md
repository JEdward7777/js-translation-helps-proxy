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

The project includes a pre-configured `wrangler.toml` file. Review and update if needed:

```toml
name = "js-translation-helps-proxy"
main = "dist/openai-api/index.js"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
NODE_ENV = "production"
UPSTREAM_URL = "https://translation-helps-mcp.pages.dev/api/mcp"
TIMEOUT = "30000"
LOG_LEVEL = "info"

# OpenAI API baked-in filters (Interface 4)
OPENAI_LANGUAGE = "en"
OPENAI_ORGANIZATION = "unfoldingWord"
OPENAI_FILTER_NOTES = "true"
OPENAI_MAX_ITERATIONS = "5"
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

This compiles TypeScript to JavaScript in the `dist/` directory.

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

# List models (OpenAI API)
curl http://localhost:8787/v1/models

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

# Test OpenAI API
curl -X POST $WORKER_URL/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "translation-helps-proxy",
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
   - `Debug Node.js Server (Interface 4)` - Debug HTTP server with hot reload
   - `Debug Node.js Server (Built)` - Debug compiled HTTP server
   - `Debug stdio Server (Interface 3)` - Debug stdio server
   - `Debug Current Test File` - Debug the currently open test file
4. **Press F5** or click the green play button to start debugging

The debugger will:
- Stop at your breakpoints
- Allow you to inspect variables
- Step through code execution
- View call stacks
- Evaluate expressions in the debug console

**Example debugging workflow:**
```bash
# 1. Open src/openai-api/start-node.ts
# 2. Set a breakpoint on line 35 (where the server starts)
# 3. Press F5 and select "Debug Node.js Server (Interface 4)"
# 4. The debugger will stop at your breakpoint
# 5. Use the debug toolbar to step through code
```

**Note:** The Native Node.js server (`npm run dev:node`) is recommended for debugging as it provides better source map support and faster reload times than Wrangler.

---

## Environment Variables

### CloudFlare Workers (wrangler.toml)

Environment variables for CloudFlare Workers are configured in `wrangler.toml`:

```toml
[vars]
NODE_ENV = "production"
UPSTREAM_URL = "https://translation-helps-mcp.pages.dev/api/mcp"
TIMEOUT = "30000"
LOG_LEVEL = "info"
OPENAI_LANGUAGE = "en"
OPENAI_ORGANIZATION = "unfoldingWord"
OPENAI_FILTER_NOTES = "true"
OPENAI_MAX_ITERATIONS = "5"
```

### Local Development (.env)

For local development, create a `.env` file (already in `.gitignore`):

```bash
# .env file (DO NOT COMMIT)

# Upstream server
UPSTREAM_MCP_URL=https://translation-helps-mcp.pages.dev/api/mcp
TIMEOUT=30000
LOG_LEVEL=debug

# For LLM Helper tests (optional)
OPENAI_API_KEY=your-openai-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here

# OpenAI API settings
OPENAI_LANGUAGE=en
OPENAI_ORGANIZATION=unfoldingWord
OPENAI_FILTER_NOTES=true
OPENAI_MAX_ITERATIONS=5
```

### Environment-Specific Configuration

```toml
# Development environment
[env.development]
vars = { LOG_LEVEL = "debug" }

# Production environment
[env.production]
vars = { LOG_LEVEL = "info" }
```

Deploy to specific environment:

```bash
# Development
npx wrangler deploy --env development

# Production
npx wrangler deploy --env production
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (`npm test`)
- [ ] Code linted (`npm run lint`)
- [ ] Code formatted (`npm run format`)
- [ ] Build successful (`npm run build`)
- [ ] Local testing complete (`npm run dev:http`)
- [ ] Environment variables configured
- [ ] `wrangler.toml` reviewed and updated
- [ ] Version number updated in `package.json`
- [ ] CHANGELOG.md updated

### Deployment

- [ ] Authenticate with CloudFlare (`npx wrangler login`)
- [ ] Deploy to staging/preview first
- [ ] Test deployed endpoints
- [ ] Verify all interfaces work:
  - [ ] Health endpoint (`/health`)
  - [ ] OpenAI API (`/v1/chat/completions`)
  - [ ] MCP HTTP endpoints (`/mcp/*`)
- [ ] Check CloudFlare Workers dashboard
- [ ] Monitor initial requests

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
vars = { LOG_LEVEL = "debug" }

# Production environment
[env.production]
name = "js-translation-helps-proxy-production"
vars = { LOG_LEVEL = "info" }
```

Deploy to specific environment:

```bash
npx wrangler deploy --env staging
npx wrangler deploy --env production
```

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

For sensitive data (API keys, etc.):

```bash
# Set secret in CloudFlare Workers
npx wrangler secret put OPENAI_API_KEY

# List secrets
npx wrangler secret list

# Delete secret
npx wrangler secret delete OPENAI_API_KEY
```

Access secrets in code:

```typescript
// In CloudFlare Workers environment
const apiKey = env.OPENAI_API_KEY;
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