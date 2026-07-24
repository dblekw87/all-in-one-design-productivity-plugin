# Browser Runtime

## Playwright Choice

Parser Server uses `playwright` with Chromium for the MVP. This keeps local development and Browser API usage simple. Parser Server operating code does not depend on the Playwright test runner.

Install Chromium:

```bash
corepack pnpm playwright:install
```

Linux containers or CI may need:

```bash
corepack pnpm playwright:install:with-deps
```

Browser binaries and caches are not committed to Git.

## Process Policy

The Parser Server process owns one lazily launched Chromium browser process and reuses it across analyze requests. Each analyze execution creates a fresh `BrowserContext` and a `Page` from that context. Operating code does not use `browser.newPage()`.

## BrowserContext Isolation

The runtime applies the analyze viewport at context creation and fixes reproducibility-oriented settings: JavaScript enabled, `ignoreHTTPSErrors: false`, `serviceWorkers: "block"`, `locale: "en-US"`, `timezoneId: "UTC"`, `colorScheme: "light"`, and `reducedMotion: "reduce"`.

Service workers are blocked in the MVP to reduce cache and request-control variance.

## Navigation

The runtime uses `page.goto(..., { waitUntil: "domcontentloaded" })`. `networkidle` is not used as the default because analytics, polling, sockets, or long-running requests can prevent it from completing.

The result contains only serializable metadata: requested URL, final URL, main document status code, content type, title, applied viewport, and timing.

Step 8 adds a validated DOM Snapshot rooted at `body` after navigation. Step 9 adds a validated Computed Style Snapshot, and Step 10 adds validated Geometry Evidence keyed by DOM Element Snapshot ID. Layout inference, Design IR, screenshot, Playwright objects, cookies, and storage are still not returned.

The BrowserContext route guard is installed before navigation. Every request is inspected through the safe navigation boundary before it is continued.

## Timeout And Cancellation

Parser config separates browser launch, navigation, and close timeouts:

- `PARSER_BROWSER_LAUNCH_TIMEOUT_MS`
- `PARSER_NAVIGATION_TIMEOUT_MS`
- `PARSER_BROWSER_CLOSE_TIMEOUT_MS`

Analyze routes pass an `AbortSignal` to the analyze service. The Browser Runtime checks cancellation before navigation and closes the context if cancellation occurs. Cancellation maps to `BROWSER_NAVIGATION_CANCELLED`; the shared Browser process remains alive.

## Cleanup And Shutdown

Every navigation closes its BrowserContext in `finally` on success, failure, timeout, or cancellation. Browser process cleanup is connected to Fastify `onClose`, so parser server shutdown closes the Browser Runtime.

## Fixture Integration Test

Step 6 integration tests start a local static HTTP server for `fixture-basic-landing-v1`, navigate Chromium to it, collect page metadata, and shut down both context and browser.

Production security remains HTTPS-only and localhost-blocking. The Browser Runtime integration test bypasses the production target validator by directly testing the lower-level runtime with a controlled fixture URL.

## Security Boundary

Analyze production entry still requires a `ValidatedTarget` from the Step 4 target security validator. Browser Runtime can navigate a URL string, but Analyze pipeline supplies only validated targets.

Step 7 must add safe navigation revalidation: re-resolve before browser navigation, validate redirect destinations, detect HTTPS-to-HTTP final downgrade, block public-to-private DNS changes, and avoid navigating unchecked public targets.

Step 7 implements the application-layer guard. Infrastructure egress controls are still required for production.

## Error Mapping

Browser errors are serialized with stable codes:

- `BROWSER_LAUNCH_FAILED`
- `BROWSER_DISCONNECTED`
- `BROWSER_CONTEXT_CREATION_FAILED`
- `BROWSER_PAGE_CREATION_FAILED`
- `BROWSER_NAVIGATION_FAILED`
- `BROWSER_NAVIGATION_TIMEOUT`
- `BROWSER_NAVIGATION_CANCELLED`
- `BROWSER_RESPONSE_MISSING`
- `BROWSER_RUNTIME_CLOSED`
- `BROWSER_CLEANUP_FAILED`

Raw Playwright errors, launch arguments, local paths, and stack traces are not returned to API clients.

## Forbidden Patterns

- Do not store persistent browser profiles.
- Do not preserve cookies or local storage between targets.
- Do not add CAPTCHA, anti-bot, proxy rotation, or fingerprint spoofing logic.
- Do not add Firefox/WebKit support before Chromium MVP is stable.
- Do not collect DOM, CSS, screenshots, HAR, trace, or video in this step.
- Do not weaken production localhost blocking for fixture convenience.
