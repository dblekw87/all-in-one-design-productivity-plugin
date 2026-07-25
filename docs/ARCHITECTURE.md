# Architecture

## Recommended Repository Shape

Use a monorepo with disciplined package boundaries. The project has multiple runtime targets from day one: Figma UI, Figma main thread, Parser Server, browser worker, and shared contracts. Shared IR and message contracts justify a monorepo.

Avoid over-splitting implementation packages during the first vertical slice. Start with clear directories and promote modules to separate packages only when two runtimes consume them.

## System Overview

```text
Figma Plugin UI
  -> Message Bus
Figma Plugin Main Thread
  -> Capability Registry
  -> Website Import Capability
  -> Parser Server API
  -> Node Renderer
  -> Mutation Engine
  -> History Manager

Parser Server
  -> Security Gate
  -> Analyze API
  -> Playwright Browser Worker
  -> DOM/CSS Extractor
  -> Layout Inference
  -> Asset Pipeline
  -> Design IR Response
```

## Plugin UI Responsibilities

- Navigation and capability screens.
- Website Import form.
- Preview and progress rendering.
- Result, history, and settings UI.
- Typed message requests.

## Plugin Main Thread Responsibilities

- Capability execution.
- Figma node creation and mutation.
- Font loading.
- Selection and canvas positioning.
- History and restore.
- Result reporting.

## Parser Server Responsibilities

Parser Server is a required Website Import runtime component, not an optional future enhancement. The Figma Plugin does not provide a fallback path that fetches and analyzes public websites by itself.

- Validate and normalize URL.
- Block private networks, localhost, link-local addresses, metadata endpoints, unsafe protocols, credentials, and unsafe redirects.
- Render page with Playwright.
- Wait for stable layout, fonts, and images.
- Extract DOM, computed styles, bounds, assets, and text.
- Normalize to Design IR.
- Return preview and import payloads.

The plugin must not directly fetch external website HTML, insert external pages in iframes, inspect cross-origin DOM, run Playwright/Puppeteer, proxy external images, perform full CSS parsing, enforce SSRF controls, or manage headless browsers.

## Playwright Browser Worker

Browser workers are pooled with concurrency limits. Each job has:

- Timeout.
- Redirect cap.
- Resource size limit.
- Viewport.
- User agent policy.
- Abort support.

## Intermediate Representation

Design IR is the stable boundary between browser analysis and Figma rendering. It is serializable, versioned, and independent from Figma API types.

## Asset Pipeline

Asset Pipeline resolves:

- `img`
- `srcset`
- `picture`
- CSS background images.
- Inline and external SVG.
- Data URLs where allowed.

It sanitizes SVG, limits size, caches by hash/source, and reports failures.

## Font Pipeline

Parser detects font families and weights. Plugin Font Loader maps them to available Figma fonts, loads the selected font before applying text characters, caches session font loads, and reports substitutions without adding Figma font types to Design IR.

## Node Renderer

Node Renderer converts Design IR to Figma node operations:

- Frame creation.
- Auto Layout mapping.
- Text creation.
- Image paint application.
- Vector/SVG handling.
- Raster fallback layer creation.
- Role-based naming.

The renderer should produce mutation operations rather than directly mixing rendering logic with history logic.

## Error Reporter

Errors use typed contracts:

- Validation errors.
- Parser errors.
- Security errors.
- Asset errors.
- Font errors.
- Render errors.
- Partial failures.

## Data Flow

1. Figma Plugin UI sends an import request.
2. Figma Plugin Main Thread coordinates Website Import capability execution.
3. Capability calls Parser Server API.
4. Parser Server validates URL and request limits.
5. Playwright Browser Worker renders the website at the selected viewport.
6. Parser creates a versioned DOM Snapshot rooted at `body`.
7. Parser adds a separate Computed Style Snapshot keyed by DOM Snapshot Element IDs.
8. Parser joins DOM, Style, and Geometry Snapshots into a versioned Normalized Page Model.
8. Parser adds separate Geometry Evidence keyed by the same Element IDs.
9. Later parser stages add normalized layout evidence, layout inference, sizing inference, assets, and Design IR.
10. Figma Plugin Main Thread receives IR and later renders Figma nodes.
9. Mutation Engine creates nodes in chunks in implementation steps after scaffold.
10. History Manager records operation in implementation steps after scaffold.

## Contract Draft

Requests:

- `websiteImport.preview`: URL, viewport, options.
- `websiteImport.execute`: URL, viewport, options, optional preview token.

Responses:

- Preview summary.
- Design IR payload.
- Capability result.
- Progress events.

## Deployment

Local development:

- Vite for plugin UI.
- Figma plugin manifest pointing to built UI and main bundle.
- Parser Server running locally as a separate process at `http://127.0.0.1:${PARSER_SERVER_PORT}`.
- Fixture pages served locally through a safe test origin.

Development Parser Server settings are environment-driven:

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
PARSER_SECURITY_INSPECTION_ENABLED=true
```

Step 4 exposes `POST /v1/security/inspect-target` for development and contract verification. It performs URL and DNS security inspection only; it does not fetch pages or run a browser.

Step 5 exposes `POST /v1/imports/analyze`. It validates the versioned analyze request, reuses the security gate, and returns a placeholder `NOT_IMPLEMENTED` analyze response until Browser Runtime is implemented.

Step 6 connects the Analyze API to Playwright Chromium Browser Runtime. It creates a fresh BrowserContext per analyze request, navigates to the validated target, captures page metadata, and still does not extract DOM/CSS or create Design IR.

Step 7 installs a BrowserContext network guard before navigation. The guard applies protocol, method, resource type, DNS/IP, redirect, final URL, request limit, status, and content-type policies before Browser Runtime results are accepted.

Step 8 extracts a validated, serializable DOM Snapshot after safe navigation. It preserves semantic structure and flags while excluding executable/style metadata nodes. It does not infer layout or create Design IR.

Steps 9-12 extend the same pipeline with Computed Style Snapshot, Geometry Evidence, Snapshot Normalization, and Layout Evidence. Layout Evidence records parent/child geometry relationships, spacing, alignment, overlap, wrapping candidates, and CSS source evidence without selecting a final layout mode or creating Design IR.

Step 13 adds a separate rule-based Layout Inference layer. It returns mode, confidence, reasons, conflicts, and fallback strategy without creating Figma nodes or Design IR.

Step 14 adds a separate rule-based Sizing Inference layer. It infers width and height independently using CSS size source, parent/content geometry relations, Layout Evidence, and Layout Inference. It does not use Figma sizing enums, create Design IR, or download assets.

Step 15 adds Asset Reference Extraction. It deduplicates IMG, selected picture source, inline SVG, CSS background, and pseudo background references without downloading binary data. Asset URLs reuse the existing Security Validator; `assetReferences` is separate from the still-empty binary `assets` field.

Step 16 adds request-scoped Asset Resolution. It performs fetch-time URL revalidation, manual redirect checks, streaming byte limits, MIME/signature inspection, SHA-256, basic image metadata, and conservative SVG XML checks. Binary bytes remain internal and `resolvedAssets` exposes metadata only.

Step 17 adds the platform-independent Design IR. It maps normalized nodes, layout/sizing inference, and asset metadata into deterministic DOCUMENT/FRAME/TEXT/IMAGE/VECTOR/UNSUPPORTED nodes. It does not import Figma types or create Figma nodes.

Production:

- Plugin bundles hosted as Figma plugin assets.
- Parser Server deployed behind HTTPS.
- MVP keeps HTTP API, URL Security Validator, Browser Manager, Page Parser, Asset Resolver, Layout Inference, and Design IR Builder in one long-running Docker-oriented service.
- Observability with redacted logs.
- Strict origin and network egress policy.

Headless Chromium makes long-running Docker-based services a better default than short-duration serverless functions. Queue, Redis, database, object storage, and separate worker pools should be introduced only after synchronous MVP limits are insufficient.

## Parser Server Failure Handling

If Parser Server is unavailable:

- UI shows a clear connection error.
- Import cannot execute.
- Settings offers server URL verification.
- No fallback to in-plugin web parsing.
## Step 18: Asset Transfer Session

Resolved Asset Binary는 Analyze JSON에 포함하지 않는다. Parser Server는 검증된 Runtime Binary를 짧은 TTL의 요청 단위 Import Session에 보관하고, Plugin에는 Session-scoped Bearer Token과 Asset Transfer Manifest만 반환한다. Asset GET과 Session DELETE는 Parser Server가 제공하며 Persistent Storage와 Figma Renderer는 후속 단계다.
# Renderer Runtime

The Plugin Main Thread now contains a Figma-independent Design IR renderer foundation. `render-design-ir` validates the IR, uses an adapter-bounded factory registry, tracks IR-to-Figma IDs, reports progress, and rolls back session-owned nodes on fatal failure. Step 23 adds adapter-bounded Frame Auto Layout, parent-relative geometry, solid visual mapping, clipping, and basic shadow support; complex CSS layout and visual effects remain later stages.

Raster transfer is now an injected Plugin-side concern: the Asset Client validates session manifests and binary metadata, while the Image Adapter owns `figma.createImage()` and Image Paint calls.
## SVG Rendering Boundary

The Plugin consumes only Parser-sanitized SVG transfer entries. UTF-8 decoding, assertion-level preflight, and `createNodeFromSvg()` are isolated from the Parser and Design IR packages. SVG transfer shares the existing Session, Cache, Cancellation, Rollback, and Cleanup lifecycle with Raster assets.
