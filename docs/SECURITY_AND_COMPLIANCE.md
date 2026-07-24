# Security And Compliance

## SSRF Defense

Parser Server must block:

- `localhost`
- Loopback IPs.
- Private IPv4 ranges.
- Link-local addresses.
- IPv6 local/private equivalents.
- Cloud metadata endpoints.
- Non-HTTPS protocols in MVP.

Step 4 implements the first URL security gate in Parser Server: schema validation, HTTPS-only policy, credential rejection, hostname normalization, injectable DNS resolution, public IP classification, metadata endpoint blocking, and redirect policy logic.

DNS resolution must also be checked immediately before Browser navigation and after redirects in the Browser implementation step.

Step 7 adds an application-layer BrowserContext route guard so main document, redirects, iframes, scripts, stylesheets, images, fonts, XHR, fetches, and other requests are inspected before continuation. This does not replace infrastructure network isolation.

Production must also block private, loopback, link-local, metadata, and internal-network egress at the container, VM, firewall, or network policy layer.

Step 16 applies the same policy again immediately before resolving an asset reference and at every asset redirect hop. Asset responses are bounded and inspected by Content-Type plus file signature; HTML, script, unsupported media, oversized bodies, invalid signatures, and unsafe SVG content are rejected per-asset. Cookies, Authorization, Referer, raw SVG, Data URL payloads, and binary bytes are not exposed in logs or Shared Contracts. Application-layer validation does not replace infrastructure egress controls.

## URL Validation

Allowed schemes:

- Production: `https`.
- Development fixtures: controlled `http` origins only if explicitly added later.

Normalize and validate final redirected URL. Limit redirect count.

## Private Network Blocking

Requests to private network targets must fail even if the user enters them intentionally. This avoids turning the Parser Server into a network proxy.

## External Resource Limits

Apply limits to:

- Response body size.
- Image size.
- SVG size.
- Page runtime.
- Browser memory.
- Number of requests.
- Number of assets.
- Redirect depth.

## Malicious HTML And SVG

- Do not execute arbitrary extracted scripts in plugin.
- Sanitize SVG.
- Remove script tags, event attributes, external references, and unsafe URLs.
- Treat SVG import failures as raster fallback or placeholder.

## Copyright And Terms

The plugin should ask users to import only pages they own, have permission to use, or may lawfully reference. It should not claim that imported designs are free of third-party rights.

## Authenticated And Paid Content

MVP excludes:

- Login-required pages.
- Paid content.
- Bypassing access controls.
- Session cookie import.
- Browser profile reuse.

## User Permission Copy

Before import, UI should state that the user is responsible for having permission to import the target page and that the plugin will send the URL to the configured Parser Server.

## UX Writing Data Policy

Future UX Writing should send only selected text nodes and minimal surrounding context after explicit user action. It must not send the whole Figma document by default.

## API Key Policy

Do not hardcode API keys in plugin UI. Prefer server proxy or user-managed secure provider flows. Avoid plaintext storage in `clientStorage` for sensitive keys.

## Logging Policy

Logs must redact:

- URL query tokens.
- Authorization headers.
- Cookies.
- Page text content unless debug mode explicitly allows local-only logging.
- API keys.

Full user-provided URLs should not be logged without removing or truncating query strings because query parameters can contain tokens.

## Data Retention

Parser Server should avoid retaining page content or screenshots by default. Temporary assets should expire. Production retention must be documented before launch.

## Parser And AI Separation

Parser Server handles website rendering and extraction. Future AI proxy handles AI provider calls. They may share auth and observability infrastructure, but their responsibilities, data scopes, and retention policies should remain separate.
## Asset Transfer Session

Asset Transfer는 Session-scoped Bearer Token, Token Hash, 짧은 TTL, Session/Byte/Download 제한을 사용한다. Token은 URL Query와 로그에 노출하지 않는다. Asset 응답은 `no-store`와 `nosniff`를 사용하고 SVG는 CSP sandbox를 적용한다. Session Store는 현재 요청 단위 In-Memory이며 Persistent Storage는 구현하지 않는다.
