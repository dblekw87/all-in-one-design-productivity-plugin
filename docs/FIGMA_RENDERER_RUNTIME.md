# Figma Renderer Runtime

## Purpose

Step 19 establishes the Figma Plugin Main Thread runtime that validates a Design IR, creates a traceable node tree, reports progress, and rolls back nodes created by the current render session when rendering fails or is cancelled.

The runtime does not download assets, create Image Paints, convert SVG paths, load fonts, or call the Parser Server.

## Boundaries

The Plugin imports only shared contracts and Design IR types. Figma API access is isolated behind `FigmaRendererAdapter`. The renderer runtime, registry, factories, and tests use the adapter interface; the production adapter is the only module that touches the `figma` global.

Design IR remains platform independent. Figma node objects never cross a capability or message response boundary.

## Runtime Flow

```text
Design IR
-> schema and semantic validation
-> renderer preflight limits
-> Render Session
-> preorder factory traversal
-> parent creation and child append
-> mapping and progress events
-> commit or rollback
```

`DOCUMENT` is a logical root and becomes a top-level Frame. `FRAME` becomes a Frame. TEXT, IMAGE, VECTOR, and unsupported content use bounded placeholders until their dedicated rendering steps are implemented.

## Session and Mapping

Each render has a Plugin-local session with a unique internal ID, created node IDs, and an `irNodeId -> figmaNodeId` map. Rollback removes only node IDs registered by that session, in reverse creation order. Existing user nodes are never part of the rollback set.

The runtime uses preorder traversal: a parent factory runs before its children, then each child is appended to the created parent. Positioned and fallback geometry remain represented by the IR and are not reinterpreted by this foundation.

## Placement

The root supports `PAGE_ORIGIN`, `CURRENT_VIEWPORT`, and `SELECTION_OFFSET`. Selection offset falls back to viewport placement when no selection bounds are available.

## Progress and Cancellation

Progress stages are `VALIDATING_IR`, `CREATING_ROOT`, `CREATING_NODES`, `APPLYING_HIERARCHY`, `COMMITTING`, `ROLLING_BACK`, and `COMPLETED`. The capability runtime forwards these events using its existing progress contract.

The AbortSignal is checked before validation completion, before and after node creation, before child traversal, and before commit. Cancellation is reported separately from ordinary renderer failure and follows the configured rollback policy.

## Failure Policy

Factory, parent, append, limit, and commit failures are normalized to renderer error codes. The default request policy rolls back the complete current session on a fatal error. Placeholder creation and skipped nodes are non-fatal and are reflected in metrics and warnings.

Preflight limits cover node count, tree depth, and geometry dimensions. Text content, URLs, transfer tokens, binary data, and raw SVG are not copied into errors, plugin data, or logs.

## Capability Integration

The experimental `render-design-ir` capability accepts a Design IR payload and invokes the renderer runtime. The existing URL-based `website-import` placeholder capability remains unchanged. A later step can connect parser analysis and the asset transfer client without coupling those concerns to the renderer foundation.

## Test Strategy

Unit and integration tests use `FakeFigmaRendererAdapter`, an in-memory node tree implementing the production adapter interface. Tests cover registry resolution, preorder creation, placeholders, progress, cancellation, rollback, and capability execution without requiring a Figma host.

## Deferred Work

SVG vector conversion, font loading, rich text, full Auto Layout mapping, Grid rendering, and user-facing Website Import UI are intentionally deferred. Raster Asset Client and Image Paint support are documented in `docs/FIGMA_ASSET_CLIENT.md`.
## SVG Asset Boundary

Raster and sanitized SVG assets share the Renderer Runtime transfer session. Raster assets use the Image Adapter; `SANITIZED_SVG` assets use the SVG Adapter and are created per VECTOR placement. Session cleanup remains owned by the Runtime and is executed once for both asset types.
