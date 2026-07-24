# Development Setup

## Requirements

- Node.js `>=20.11.0`
- pnpm `>=9.0.0`

The root `package.json`, `.nvmrc`, and `.node-version` document the expected Node and pnpm versions.

## Install

Run all setup commands from the repository root:

```text
<project-root>/
```

Confirm Git is scoped to the project before installing dependencies:

```bash
git rev-parse --show-toplevel
```

The result should point to `<project-root>`, not a parent user or workspace directory.

```bash
pnpm install
```

## Develop

Run all workspace dev tasks:

```bash
pnpm dev
```

Run only the Parser Server:

```bash
pnpm --filter @aio/parser-server dev
```

Run only the Fixture Website:

```bash
pnpm --filter @aio/fixture-website dev
```

Run only the Figma Plugin build watcher/dev server:

```bash
pnpm --filter @aio/figma-plugin dev
```

## Build

```bash
pnpm build
```

## Typecheck

```bash
pnpm typecheck
```

## Test

```bash
pnpm test
```

## Lint

```bash
pnpm lint
```

## Figma Plugin Local Registration

1. Build the plugin with `pnpm --filter @aio/figma-plugin build`.
2. In Figma Desktop, open Plugins development settings.
3. Import manifest from `apps/figma-plugin/manifest.json`.
4. Run the plugin and confirm the UI shows `Website Import` and `Status: Ready`.

The plugin scaffold does not perform Website Import yet.

## Parser Server Local Execution

The Parser Server is a required Website Import runtime and runs as a separate process:

```bash
PARSER_SERVER_PORT=4000 pnpm --filter @aio/parser-server dev
```

On Windows PowerShell:

```powershell
$env:PARSER_SERVER_PORT = "4000"
pnpm --filter @aio/parser-server dev
```

Health check:

```bash
curl http://127.0.0.1:4000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "parser-server"
}
```

## Parser Server Environment Variables

```env
PARSER_SERVER_PORT=4000
PARSER_SERVER_HOST=127.0.0.1
PARSER_MAX_URL_LENGTH=2048
PARSER_REQUEST_TIMEOUT_MS=30000
PARSER_MAX_REDIRECTS=5
PARSER_MAX_RESPONSE_BYTES=10485760
PARSER_BROWSER_CONCURRENCY=2
PARSER_BROWSER_LAUNCH_TIMEOUT_MS=30000
PARSER_NAVIGATION_TIMEOUT_MS=15000
PARSER_BROWSER_CLOSE_TIMEOUT_MS=5000
PARSER_MAX_NETWORK_REQUESTS=500
PARSER_MAX_DOM_DEPTH=100
PARSER_MAX_DOM_NODES=5000
PARSER_MAX_TEXT_NODE_LENGTH=10000
PARSER_MAX_STYLE_ENTRIES=5000
PARSER_MAX_STYLE_WARNINGS=100
PARSER_MAX_GEOMETRY_ENTRIES=5000
PARSER_MAX_TEXT_NODE_LENGTH=10000
PARSER_SECURITY_INSPECTION_ENABLED=true
```

## Playwright Chromium

Install Chromium for Parser Server Browser Runtime:

```bash
corepack pnpm playwright:install
```

Linux containers or CI may require system dependencies:

```bash
corepack pnpm playwright:install:with-deps
```

Security inspection endpoint for local development:

```bash
curl -X POST http://127.0.0.1:4000/v1/security/inspect-target \
  -H "content-type: application/json" \
  -d "{\"url\":\"https://example.com\"}"
```

This endpoint validates the target URL and DNS result only. It does not fetch the page or start a browser.

Analyze endpoint:

```bash
curl -X POST http://127.0.0.1:4000/v1/imports/analyze \
  -H "content-type: application/json" \
  -d "{\"contractVersion\":\"1.0\",\"url\":\"https://example.com\"}"
```

After Step 6, safe targets return `status: "BROWSER_NAVIGATED"` with basic page metadata. DOM/CSS extraction is still not implemented.

Fixture Website:

```text
http://127.0.0.1:4300/fixtures/basic-landing-v1
```

The production Parser Server security policy remains HTTPS-only. Local fixture HTTP handling is deferred to the Browser integration step through local HTTPS or a development-only injected security policy.

## Common Initial Errors

- `pnpm: command not found`: install pnpm through Corepack or the official pnpm installer.
- Corepack cannot create global pnpm shim on Windows: use `corepack pnpm <command>` or install pnpm in a writable user-level location.
- Figma cannot load plugin UI: run `pnpm --filter @aio/figma-plugin build` and confirm `apps/figma-plugin/dist/index.html` exists.
- Parser port conflict: set `PARSER_SERVER_PORT` to another local port.
- Workspace package resolution failure: run `pnpm install` from repository root, not from an app folder.
# Renderer Tests

Renderer tests use the in-memory `FakeFigmaRendererAdapter`; they do not require a Figma host. Run the normal workspace `build`, `typecheck`, `test`, and `lint` commands to validate the Plugin bundle and renderer capability.

Asset Client tests stub `fetch` and use `FakeFigmaImageAdapter`; no external network or real Figma image API is required.
