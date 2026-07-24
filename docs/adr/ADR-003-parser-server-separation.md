# ADR-003: Separate Parser Server

## Status

Accepted.

## Decision

Website rendering, computed style extraction, layout measurement, asset fetching, and URL security enforcement run in a Parser Server backed by Playwright.

## Rationale

Figma plugins cannot reliably render arbitrary websites or enforce network security policies. Browser automation and SSRF defense require a server-side boundary.

## Consequences

- MVP requires local Parser Server during development.
- Production requires hosted Parser Server.
- Parser Server failures must be handled clearly in UI.
