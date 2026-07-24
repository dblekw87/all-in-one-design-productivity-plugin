# Safe Browser Navigation

## Threat Model

The Browser Runtime can cause Chromium to request main documents, redirects, iframes, scripts, stylesheets, images, fonts, XHR, fetches, and other subresources. A single initial URL validation is not enough because a public page can redirect or reference private-network resources.

Step 7 implements an application-layer navigation boundary. It is not a complete SSRF defense by itself.

## Infrastructure Security Requirement

Application-level DNS checks and Playwright request interception do not guarantee full DNS rebinding or network isolation protection. Production Parser Server must also use infrastructure controls:

- block RFC1918 private network egress
- block loopback egress
- block link-local and cloud metadata endpoints
- restrict internal DNS zones
- allow only required external HTTPS egress
- avoid colocating Parser Server with sensitive internal systems
- run Browser workers in isolated containers or VMs

Docker, Kubernetes, firewall, and network policy implementation is outside Step 7.

## Safe Navigation Flow

```text
Validated initial target
-> BrowserContext creation
-> context route guard installation
-> request descriptor mapping
-> protocol/method/resource policy
-> URL security validator
-> DNS/IP revalidation
-> continue or abort
-> final URL validation
-> main response status and content-type validation
-> security report
-> context cleanup
```

The route guard is installed before the primary page is created and before navigation starts.

## Request Descriptor

Playwright request objects are converted into serializable descriptors:

- request id
- URL
- method
- normalized resource type
- navigation request flag
- frame URL
- redirect source request/url

Playwright types do not spread through security domain logic.

## Protocol Policy

Top-level and subresource network requests allow only HTTPS after security validation.

Special cases:

- `about:blank` is allowed for browser-internal blank documents.
- `data:image/*` is allowed only for image resources.
- `blob:` is blocked in MVP.
- `http:`, `file:`, `ftp:`, `javascript:`, `ws:`, and `wss:` are blocked.

## Method Policy

Allowed:

- `GET`
- `HEAD`
- `OPTIONS`

Blocked by default:

- `POST`
- `PUT`
- `PATCH`
- `DELETE`
- form submissions and beacons when surfaced through blocked methods

This can break sites that require POST during initial render. MVP chooses security over completeness.

## Resource Type Policy

Allowed candidates after URL security validation:

- document
- stylesheet
- image
- font
- script
- xhr
- fetch
- manifest
- other

Blocked:

- websocket
- eventsource
- media
- texttrack

If Playwright reports an unknown resource type, it is normalized to `other` and still goes through URL security validation.

## DNS/IP Revalidation

Every HTTPS request goes through the existing Parser Server URL security validator. That validator normalizes the URL, rejects credentials and forbidden hostnames, resolves DNS, and blocks private, loopback, link-local, reserved, multicast, metadata, and IPv4-mapped private IPv6 addresses.

Public/private mixed DNS results are blocked. DNS failure and empty DNS results are blocked.

## Redirects

Redirected Playwright requests are inspected as new requests. The guard:

- counts redirect requests
- enforces `PARSER_MAX_REDIRECTS`
- blocks HTTPS-to-non-HTTPS downgrade
- revalidates redirect target URL, hostname, DNS, and IP

Redirect report currently records aggregate redirect count rather than a full hop list.

## Final URL

After navigation, `page.url()` is validated again through the same safe request inspector as a document GET request. Blocked final URLs raise `BROWSER_FINAL_URL_BLOCKED`.

## HTTP Status

Main document policy:

- 200-299: accepted
- 400-499: `TARGET_HTTP_CLIENT_ERROR`
- 500-599: `TARGET_HTTP_SERVER_ERROR`
- null response: `BROWSER_RESPONSE_MISSING`

3xx should normally be resolved by browser redirects before final response handling.

## Content-Type

Allowed main document content types:

- `text/html`
- `application/xhtml+xml`

Other main document content types are rejected with `TARGET_CONTENT_TYPE_NOT_SUPPORTED`.

## Popup, Download, WebSocket

Popups are closed and recorded as `BROWSER_POPUP_BLOCKED`.

Downloads are cancelled and recorded as `BROWSER_DOWNLOAD_BLOCKED`. Download files are not stored.

WebSocket and EventSource resource types are blocked by resource policy when surfaced through Playwright routing. Additional infrastructure egress controls remain required.

## Asset Resolution Boundary

Step 16 applies a separate request-scoped boundary when supported asset references are resolved after browser analysis. Asset fetches use manual redirects, repeat URL/DNS/IP validation for every hop, send no browser cookies or authorization headers, and enforce timeout, concurrency, content-length, streaming byte, and total-byte limits. Response headers are not trusted as the sole MIME decision; file signatures are inspected before a binary is accepted.

## Request Limit

`PARSER_MAX_NETWORK_REQUESTS` limits request count per navigation. When exceeded, the guard aborts the request and records `NETWORK_REQUEST_LIMIT_EXCEEDED`.

The limit is request-scoped and is not a persistent cache or analytics mechanism.

## Security Report

Browser navigation result includes a serializable security report:

- total requests
- allowed requests
- blocked requests
- redirect count
- blocked count by code
- sanitized warnings

Full query strings, credentials, stack traces, and raw Playwright objects are not exposed.

## Tests

Tests cover:

- safe request inspector URL, DNS, protocol, method, resource, data/about/blob, and redirect downgrade policies
- Browser Runtime fixture navigation
- request limit failure
- 404 and non-HTML main response policy
- Browser Manager cleanup
- Analyze route regression with injected services

Tests do not access public Internet. The fixture Browser test uses a local static HTTP server and a test-only inspector without weakening production localhost blocking.

## Forbidden Patterns

- Do not bypass the Step 4 URL security validator in production navigation.
- Do not add localhost to production allowlists for fixture convenience.
- Do not log complete query strings.
- Do not claim application-layer checks fully solve DNS rebinding.
- Do not collect DOM, CSS, screenshots, HAR, traces, or assets in this step.
- Do not implement proxy rotation, CAPTCHA bypass, anti-bot behavior, or persistent browser profiles.
