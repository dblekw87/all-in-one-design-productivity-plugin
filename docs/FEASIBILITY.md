# Feasibility

## Conclusion

Website Import is technically feasible as a hybrid browser-rendering and Figma-node-generation system. It is not feasible to reproduce arbitrary modern websites with 100% visual fidelity as fully editable Figma nodes.

The realistic target is high-fidelity approximation for common marketing, SaaS, documentation, editorial, and simple product pages, with explicit warnings and raster fallback for effects that do not map cleanly to Figma.

## Can This Be Implemented With Only A Figma Plugin?

No, not robustly.

Figma plugins cannot safely and reliably render arbitrary public websites, wait for browser layout, resolve computed CSS, inspect `getBoundingClientRect`, process responsive layouts, download cross-origin assets, or enforce SSRF rules by themselves. The UI sandbox is not a browser automation environment and should not host parsing or crawling logic.

## Why A Parser Server Is Needed

The Parser Server provides:

- Playwright-based page rendering.
- Controlled viewport selection.
- Network and redirect policy enforcement.
- Computed style and layout extraction.
- Asset resolution and sanitization.
- SVG sanitization.
- Response size, timeout, and concurrency controls.
- Stable IR output for the plugin.

## Browser Rendering vs Figma Model

Browsers support a richer rendering model than Figma:

- CSS cascade, inheritance, pseudo-elements, layout algorithms, stacking contexts.
- Complex grid placement, floats, inline formatting, transforms, masks, filters, blend modes.
- Font fallback and shaping behavior.
- Browser-specific anti-aliasing and image rendering.

Figma supports editable design primitives, Auto Layout, text, fills, strokes, effects, constraints, components, and image paints. The models overlap but are not equivalent.

## Why 100% Fidelity Is Hard

- CSS Grid and inline layout do not map directly to Auto Layout.
- Fonts available in the browser may not exist in Figma.
- Effects such as `filter`, `backdrop-filter`, `clip-path`, `mask`, and complex gradients can require raster fallback.
- Text layout can differ due to font metrics and shaping.
- Stacking contexts and overflow behavior can differ.
- Responsive pages may alter DOM and styles based on viewport and runtime scripts.

## Realistic Quality Level

MVP should target:

- Strong structure preservation for flexbox/block pages.
- Good visual fidelity for common colors, text, images, borders, shadows, radius, and spacing.
- Editable text and frames wherever conversion confidence is high.
- Raster fallback for isolated unsupported elements instead of flattening the full page.
- Transparent result report for fidelity risks.

## Major Technical Challenges

- Inferring Auto Layout from DOM and geometry without overfitting.
- Handling font availability and fallback.
- Keeping payload size manageable.
- Creating thousands of nodes without freezing Figma.
- Mapping browser assets into Figma image paints.
- Preserving hierarchy while removing non-visible or irrelevant elements.
- Designing partial success and restore semantics.

## Legal And Security Notes

The product must only process public pages or pages the user has rights to import. It must not bypass authentication, paywalls, robots restrictions where contractually relevant, or private network boundaries. Logs must avoid sensitive URL query strings and page content unless explicitly required and consented.

## Coexistence With Future Capabilities

Website Import can coexist with future capabilities if it returns normal Figma nodes and attaches import metadata in plugin-managed history. Replace, Writing, Inspect, and Generate capabilities can operate on created nodes through the same Selection Engine, Node Scanner, Font Loader, Mutation Engine, and History Manager.

## All-In-One Performance Impact

The all-in-one direction is safe only if each capability is lazy, independently registered, and isolated. The plugin should not load all future logic into one global store or one main-thread execution path. Shared core must stay small and stable.
