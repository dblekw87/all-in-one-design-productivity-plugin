# Figma SVG Client

## Purpose

Step 21 transfers only Parser-validated `SANITIZED_SVG` assets to the Plugin Main Thread and creates a Vector Scene Tree through the Figma SVG adapter. Raw SVG references and external SVG URLs are never fetched by the Plugin.

## Transfer and Validation

SVG entries must be referenced by a Design IR `VECTOR` binding, use `SANITIZED_SVG`, and have `image/svg+xml` media type. The shared HTTP client reuses session Authorization, timeout, cancellation, redirect blocking, Content-Length, actual byte length, and SHA-256 checks. Plugin limits are applied again.

The decoded payload uses fatal UTF-8 decoding. A small Plugin-side preflight rejects obvious contract violations such as scripts, embedded document elements, event handlers, external resource URLs, JavaScript URLs, DOCTYPE, and entity declarations. This is an assertion boundary, not a replacement sanitizer.

## Cache and Factory

SVG text is cached by SHA-256 for the duration of one render. Each VECTOR placement calls `createNodeFromSvg()` separately because a Figma Scene Node cannot be reused at multiple locations. The Figma API call is isolated in `FigmaSvgAdapter`; tests use an in-memory fake adapter.

The VECTOR factory applies IR geometry and metadata to the generated root. The root is registered in the Render Session, so rollback removes the generated SVG tree with the rest of the render. Unsupported or failed SVGs become placeholders by default; `FAIL_RENDER` makes the failure fatal.

## Limits and Boundaries

SVG Text, fonts, filters, masks, animation, external resources, and path optimization are not reimplemented. SVG text is left to Figma's native import behavior. Raw SVG, access tokens, and binary payloads are not stored in Plugin Data, logs, or Render Results. Raster handling remains in the Raster Asset Client.

Transfer Session deletion is owned by the Renderer Runtime and runs once after success, failure, or cancellation. The SVG factory never deletes the shared session independently.
