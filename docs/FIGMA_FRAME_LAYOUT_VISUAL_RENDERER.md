# Figma Frame Layout & Visual Renderer

Step 23 adds the first usable Frame mapping layer. It keeps Design IR platform-independent and translates FRAME/DOCUMENT layout and visual evidence through a Figma-only adapter.

## Scale and Coordinates

Browser CSS pixels map to Figma pixels at 1:1. The DOCUMENT root uses `documentSize` when valid, otherwise measured geometry. The renderer calls `resize(width, height)` through the adapter and never calls `rescale()` on the imported root. Viewport and document-size mismatches produce `ROOT_SCALE_MISMATCH` warnings.

Child geometry is parent-relative. DOCUMENT-space child bounds are converted by subtracting the parent IR bounds exactly once. Existing PARENT-space geometry is preserved. Device pixel ratio and screenshot scale are not applied again.

## Layout Mapping

`HORIZONTAL` and `WRAPPED_HORIZONTAL` map to horizontal Auto Layout. `VERTICAL` maps to vertical Auto Layout. Vertical wrapping is currently a warning fallback. `GRID_REFERENCE`, `FREEFORM`, and low-confidence layout use `layoutMode = NONE` and preserve measured child bounds.

Padding, primary gap, cross-axis gap for supported wrapping, primary/counter alignment, and independent axis sizing are applied only through the Frame adapter. Normal flow children use Auto Layout. `positionedChildIds` and `ABSOLUTE_FALLBACK` children use `layoutPositioning = ABSOLUTE` and parent-relative `x/y`.

Fixed, relative, unknown, and constrained-like IR modes preserve measured geometry; content/intrinsic modes use Auto Layout auto sizing; stretch can use `layoutGrow` or cross-axis `layoutAlign = STRETCH` when the parent context supports it.

## Visual Mapping

The renderer applies one solid background, border color/weight, four corner radii, opacity, visibility, clipping, and one basic box shadow. Unsupported gradients, multiple background layers, unequal borders, multiple shadows, and unsupported overflow behavior produce warnings. A resolved background image remains an image paint and is layered with solid fills by the existing image adapter.

Frame names prefer an aria label, semantic tag/landmark, or cleaned source name. Full URLs, raw class lists, and generated hash-like fragments are not stored in names.

## Geometry Reconciliation

After child creation, the adapter compares the Frame's Figma width/height with IR bounds. Differences over the tolerance produce `LAYOUT_GEOMETRY_DIVERGED`; no iterative solver or layout optimization is performed.

## Runtime Behavior

The stages `VALIDATING_ROOT_SCALE`, `MAPPING_LAYOUT`, `APPLYING_AUTO_LAYOUT`, `APPLYING_SIZING`, `APPLYING_VISUALS`, and `RECONCILING_GEOMETRY` are reported without CSS, URL, token, or text payloads. Cancellation is checked before Frame creation, during mapping, before background paint, and before append. DOCUMENT/FRAME nodes register immediately after creation so orphan Frames are included in session rollback.

## Deferred Scope

Full CSS Grid, responsive constraints, complex gradients, repeated backgrounds, filters, transforms, masks, clip paths, sticky behavior, component generation, and a constraint solver remain deferred. This step does not redesign TEXT, IMAGE, or VECTOR factories.

## Figma Smoke Test

With the fixture website and Parser Server running, import `http://localhost:3000/import-test` in Figma Desktop. Confirm root width/height, body/main/aside hierarchy, horizontal header, vertical sections, padding/gap, absolute cards, text wrapping, image/SVG placement, basic fills/borders/radii/shadows, and cancellation rollback. Automated tests validate adapter calls; visual fidelity still requires the Figma host.
