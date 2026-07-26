# Browser Capture Runtime

Step 28 turns the Chrome Extension from metadata-only capture into a browser-tab snapshot source. It captures the currently rendered tab into Universal Capture Snapshot v1.0 and returns only a summary to the popup.

Renderer code remains Design IR-only. Parser upload, screenshot capture, Design IR creation, and Figma rendering are not part of this step.

## Pipeline

```text
Popup START_CAPTURE
-> Background session routing
-> Content Script RUN_BROWSER_CAPTURE
-> DOM, style, geometry, pseudo, inline SVG, asset references
-> Runtime and semantic validation
-> CaptureSnapshot v1.0
-> Popup summary
```

## Node ID

Capture node ids are deterministic within a single capture:

- `cap_root`
- `cap_000001`
- `cap_000002`
- pseudo ids such as `cap_000001::before`

IDs are assigned in document order. They do not contain text, selectors, URLs, credentials, or random UUIDs.

## DOM Capture

The content script captures `DOCUMENT`, `ELEMENT`, and normalized `TEXT` nodes. Element records include allowlisted attributes, class names, semantic metadata, hidden state, source order, depth, parent id, and child ids.

Sensitive values are excluded: password values, textarea values, full dataset, inline event handlers, nonce, integrity, cookies, localStorage, and sessionStorage.

## Style

Computed style is captured through a central allowlist. The list covers layout, flex, grid, typography, and visual properties. Browser vendor properties and CSS variables are not copied wholesale.

Flex/grid evidence is retained as source evidence only. No layout inference is performed in the extension.

## Geometry

Geometry uses `getBoundingClientRect()` in CSS pixels:

- viewport coordinates
- document coordinates
- width/height and edges
- client, offset, and scroll metrics

Transform effects are already reflected in bounding rects and are marked as evidence so later stages do not double-apply transforms.

## Pseudo

`::before` and `::after` are captured when they have meaningful content, image, mask, or visual state. Pseudo entries reference the parent capture node id and do not generate HTML.

## Inline SVG

Inline `<svg>` elements are captured as source evidence with size limits. Unsafe features are detected and warned:

- script
- foreignObject
- inline event handlers
- external href
- javascript URLs
- DOCTYPE/ENTITY

Step 28 does not sanitize SVG into renderer-ready assets.

## Asset Reference

The extension captures references only. It does not download binaries.

Sources include image `src/currentSrc/srcset`, `picture/source`, CSS background/mask images, pseudo images, SVG image href, and video poster. Canvas pixel capture is explicitly unsupported.

URLs are resolved relative to `document.baseURI`, credentials are stripped, `javascript:` is blocked, data URLs are bounded, blob URLs are marked unsupported, and gradients are not treated as asset references.

## Hidden Policy

`display:none` nodes are skipped by default unless `includeHidden` is true. `visibility:hidden`, `opacity:0`, zero-size, content-visibility, viewport intersection, hidden attribute, and aria-hidden are recorded as hidden evidence.

## Shadow DOM

Open Shadow DOM is detected and warned but not expanded in this first runtime version. Closed Shadow DOM is inaccessible by design and remains host-only evidence.

## iframe

iframe elements retain their own style and geometry. Inner same-origin and cross-origin DOM traversal is deferred. Cross-origin bypass is not attempted.

## Limits And Yield

The runtime enforces node count, depth, text length, total text, inline SVG bytes, asset reference count, and duration limits. Limit overrun returns a partial result with warnings. DOM traversal yields cooperatively every fixed node count to avoid long tab stalls.

## Progress And Cancellation

Progress stages are recorded without text, raw URLs, or raw SVG:

- `PREPARING_CAPTURE`
- `CAPTURING_DOM`
- `CAPTURING_STYLES`
- `CAPTURING_GEOMETRY`
- `CAPTURING_PSEUDO`
- `CAPTURING_SVG`
- `CAPTURING_ASSETS`
- `VALIDATING_SNAPSHOT`
- `COMPLETED`

`CANCEL_CAPTURE` marks the session cancelled and asks the content script to stop. Cancellation returns no snapshot by default.

## Snapshot Mapping

The generated snapshot fills:

- `capture`
- `document`
- `viewport`
- `scroll`
- `metadata`
- `dom`
- `styles`
- `geometry`
- `assets`
- `pseudo`
- `svg`
- `screenshots: { captures: [] }`
- `warnings`
- `metrics`

`capture.mode` is `BROWSER_TAB` and `capture.providerId` is `browser-extension`.

## Security And Privacy

The extension does not collect cookies, localStorage, sessionStorage, auth session exports, password input values, textarea values, or credential-bearing URLs. Full snapshots are not logged to console or rendered in the popup.

## Message Size

Step 28 keeps the snapshot in transient message/runtime memory only. Parser upload and streaming/chunked transfer are deferred to the next step.

## Future Boundaries

Parser integration will consume the Universal Snapshot in a later step. Screenshot capture and screenshot stitching remain a separate future capture payload, not a renderer input.
