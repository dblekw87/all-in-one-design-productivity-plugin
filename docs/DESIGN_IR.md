# Design IR

## Purpose

Design IR is the platform-independent representation between parser analysis and a future Figma renderer. It is not a Figma API object and does not contain Figma node types, image paints, binary bytes, Base64, or raw SVG.

## Contract

Version `1.0` contains a `DOCUMENT` root and discriminated `FRAME`, `TEXT`, `IMAGE`, `VECTOR`, and `UNSUPPORTED` nodes. Every node has a deterministic `ir_000001` style ID, source DOM trace, geometry, visibility, confidence, and render policy.

## Mapping

Normalized DOM Elements become Frames unless they are images, inline SVG, or unsupported media. Non-whitespace text becomes Text. Layout inference maps to platform-neutral vertical, horizontal, wrapped, grid-reference, or freeform modes. Sizing remains CONTENT, STRETCH, FIXED, RELATIVE, INTRINSIC, or UNKNOWN; it is not converted to Figma sizing properties.

Coordinates are parent-relative measured document bounds for child nodes and document coordinates for the logical root. Padding, border, radius, basic colors, opacity, overflow, typography, and raw unsupported effects are preserved only at the level needed by a future renderer.

## Assets and Fallbacks

Asset definitions remain in `assetReferences` and `resolvedAssets`. The IR contains only a deterministic binding table with asset ID, resolution metadata, hash, byte length, and render strategy. Binary buffers, Base64, credentials, full URLs, and raw SVG are excluded.

Hidden or zero-area nodes are retained with `SKIP` for traceability. Unsupported elements become explicit `UNSUPPORTED` nodes or placeholders. Low-confidence layout uses measured absolute fallback; unresolved assets use placeholders.

## Validation and Pipeline

Builder output passes Zod parsing and semantic validation for IDs, parent links, leaf children, asset bindings, finite geometry, and metrics. Analyze status is `DESIGN_IR_BUILT`; `document` contains the IR while `assets` remains reserved for a future Plugin Transfer projection.

The next boundary is the Figma Renderer. This step does not create Figma nodes, load fonts, upload assets, parse SVG paths, or implement full gradients and effects.
## Asset Transfer Boundary

Design IR Asset Binding은 Asset ID와 Binding ID만 참조한다. 실제 검증된 Binary는 후속 Import Session의 Manifest를 통해 전달하며 IR JSON에 Binary, Base64 또는 Raw SVG를 복제하지 않는다.
# Renderer Boundary

Design IR is consumed by the Plugin renderer through `apps/figma-plugin/src/main/renderer`. The renderer maps logical nodes to Figma nodes only through `FigmaRendererAdapter`; no Figma types are imported by the Design IR package. TEXT, IMAGE, VECTOR, and unsupported nodes are placeholders until their dedicated rendering steps.

Raster IMAGE bindings may be populated by the Plugin Asset Client at render time. Binary bytes and Figma image hashes remain runtime-only and are not added to the IR contract.
