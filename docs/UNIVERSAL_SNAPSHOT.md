# Universal Snapshot Specification

Step 26 defines Capture Snapshot Version 1.0. The goal is to make every capture source produce the same source-agnostic snapshot envelope before later import stages inspect or transform it.

Renderer code remains Design IR-only. This specification prepares a common capture boundary; it does not make the renderer consume snapshots directly.

## Supported Sources

The snapshot envelope is intended for:

- `PUBLIC_URL`
- `BROWSER_TAB`
- `LOCAL_HTML`
- `LOCAL_ZIP`
- `LOCALHOST`
- `SNAPSHOT`
- future VSCode, Cursor, and MCP capture sources

## Version

The current version is `1.0`, exported as `CAPTURE_SNAPSHOT_VERSION`.

Versioned snapshots are validated through the runtime schema and the parser-side `CaptureSnapshotVersionRegistry`.

## Contract

`CaptureSnapshot` contains:

- `version`: snapshot contract version.
- `capture`: capture mode, provider id, and `CaptureSource`.
- `document`: requested URL, final URL, title, content type, and capture time.
- `viewport`: width, height, and device scale factor.
- `scroll`: scroll x/y position.
- `metadata`: capture mode, provider, browser, platform, locale, theme, DPR, viewport, and scroll.
- `dom`: DOM snapshot payload.
- `styles`: style snapshot payload.
- `geometry`: geometry evidence payload.
- `assets`: asset reference payload.
- `pseudo`: before/after pseudo count summary.
- `svg`: SVG count summary.
- `screenshots`: reserved screenshot payload list. Empty in this step.
- `warnings`: normalized warning list.
- `metrics`: DOM/style/geometry/SVG/pseudo/asset/warning counts and duration.

## Builder

The parser-side builder converts provider output and browser analysis evidence into a `CaptureSnapshot`.

Current implementation builds the snapshot from the existing `PUBLIC_URL` analysis path:

```text
CaptureProvider -> BrowserNavigationResult -> AssetReferences -> CaptureSnapshot
```

The existing normalization, layout, sizing, Design IR, and renderer path remains unchanged.

## Validation

Validation has two layers:

- Runtime validation through the shared zod schema.
- Semantic validation in parser-server.

Semantic validation checks:

- supported version
- capture mode consistency
- metadata capture mode consistency
- DPR consistency
- warning count consistency
- pseudo count consistency
- SVG count consistency

## Diagnostics

`summarizeCaptureSnapshot()` produces a compact `CaptureSnapshotSummary` for logs and debugging:

- version
- capture mode/provider
- final URL/title
- DOM/style/geometry/asset/warning counts
- duration

## Future Work

Future steps can add Chrome Extension capture, screenshot capture, DOM snapshot from local HTML/ZIP, localhost capture, upload to parser, and source-specific adapters. Those adapters should emit `CaptureSnapshot` first, then downstream pipeline stages can decide how to normalize or convert it to Design IR.
