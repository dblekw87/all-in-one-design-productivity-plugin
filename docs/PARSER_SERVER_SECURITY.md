# Parser Server Security

## Threat Model

The Parser Server receives user-provided public URLs and will later run a headless browser. Without a strict target validation boundary, it could be abused as an SSRF proxy into localhost, private networks, cloud metadata endpoints, or internal services.

The Figma Plugin must never bypass this boundary by fetching, proxying, iframe-loading, or parsing external websites directly.

## Validation Flow

Current Step 4 flow:

```text
Raw URL
-> request schema validation
-> URL syntax validation
-> HTTPS protocol allowlist
-> credential rejection
-> hostname normalization
-> forbidden hostname policy
-> DNS resolution through injectable resolver
-> IPv4/IPv6 public address classification
-> safe target result
```

Browser navigation is not implemented in this step.

## Protocol Policy

MVP allows only `https:` targets. `http:`, `file:`, `ftp:`, `data:`, `javascript:`, `ws:`, and `wss:` are rejected before DNS.

Controlled local fixture support, if needed later, must be added as an explicit development-only policy and must not become the production default.

## URL Normalization

The server uses WHATWG `URL` parsing and normalizes lowercase protocol and hostname, IDNA/punycode hostnames, trailing dots, default HTTPS ports, and fragments.

URLs with embedded credentials are rejected. The default maximum URL length is `2048` characters and is configurable with `PARSER_MAX_URL_LENGTH`.

## Hostname Policy

The server blocks exact and suffix localhost forms: `localhost`, `localhost.`, and `*.localhost`. It also blocks known metadata hostnames such as `metadata.google.internal`.

Matching is exact or suffix-based where intended; `notlocalhost.com` is not blocked.

## DNS Validation

DNS resolution is performed through an injectable `DnsResolver` interface. Production uses Node DNS lookup; tests use fake resolvers and do not depend on the Internet.

DNS failure, empty DNS results, or any private/reserved address causes the entire target to fail. Direct IP URL targets go through the same IP classifier.

## IP Range Policy

IPv4 blocks include loopback, private, link-local, CGNAT, documentation, benchmarking, multicast, reserved, and broadcast ranges, including `169.254.169.254`.

IPv6 blocks include unspecified, loopback, unique-local, link-local, multicast, documentation range, and IPv4-mapped IPv6 addresses when the mapped IPv4 is not public.

Only public addresses pass.

## Metadata Endpoint

Cloud metadata services are blocked by both IP range policy and hostname policy. Hostname-specific rules are defense in depth; link-local IP blocking is the primary control.

## DNS Rebinding

Step 4 records validated target data, but full DNS pinning is deferred until the Browser step. Later browser navigation must re-resolve immediately before navigation, revalidate every redirect target, block public-to-private DNS changes, and avoid navigating to unchecked URLs.

## Redirect Validation

Redirect validation is implemented as pure policy logic. It supports maximum redirect count, relative `Location` resolution, HTTPS-to-HTTP downgrade blocking, target revalidation for each hop, private target blocking, and loop detection.

Actual redirect following is not implemented in this step.

## Error Policy

Security failures use `SerializableError` with stable codes such as `URL_PROTOCOL_NOT_ALLOWED`, `HOSTNAME_FORBIDDEN`, `DNS_RESOLUTION_FAILED`, `IP_NOT_PUBLIC`, and `REDIRECT_TARGET_BLOCKED`.

User-facing messages stay generic. Internal diagnostics must not expose stack traces, credentials, full query strings, cookies, or internal network details.

## Inspection Endpoint

Step 4 adds a development and contract verification endpoint:

```http
POST /v1/security/inspect-target
```

The endpoint returns `{ "safe": true, "normalizedUrl": "https://example.com/" }` for allowed targets and `{ "safe": false, "error": ... }` for blocked targets. It can be disabled with `PARSER_SECURITY_INSPECTION_ENABLED=false`.

## Analyze API Integration

`POST /v1/imports/analyze` reuses the same target validator. Unsafe targets return `422` and are not passed to the analyze service. Step 6 starts Chromium only after this validation. Full redirect-hop and DNS rebinding revalidation during browser navigation remains a Step 7 responsibility.

## Tests

Security tests cover URL parsing, protocol blocking, credential blocking, hostname policy, IPv4/IPv6 classification, DNS fake resolver behavior, redirect policy, route contracts, and health endpoint regression.

## Forbidden Patterns

- Fetching external pages from Plugin UI or Main Thread.
- Treating DNS failure as safe.
- Allowing mixed public/private DNS results.
- Reusing a previously checked URL after redirect without revalidation.
- Logging complete user URLs with query tokens.
- Adding Playwright navigation before target revalidation is wired into the Browser step.
