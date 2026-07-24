# Planner Decisions

## 1. Can This Be Implemented With Only A Figma Plugin?

No. A Figma-only implementation is not robust because arbitrary website rendering, computed CSS extraction, asset resolution, and SSRF enforcement require a controlled browser environment.

## 2. Is A Separate Server Required?

Yes. Parser Server is required for Playwright rendering, network policy, DOM/CSS extraction, asset processing, and IR generation.

## 3. How Close Can It Get To The Original?

Common flexbox/block pages can reach high visual similarity. Arbitrary modern websites cannot be reproduced 100% as editable Figma nodes because CSS and browser rendering exceed Figma's editable model.

## 4. Core Algorithm For Auto Layout Accuracy

Combine CSS intent with geometry:

- Use `display`, `flex-direction`, `gap`, padding, justify, align, grow, and order.
- Validate against rendered bounds.
- Infer block stacks from alignment and gap consistency.
- Assign a Layout Confidence Score.
- Use Auto Layout only when confidence is high enough.

## 5. CSS That Cannot Always Become Editable Figma Nodes

Hard cases include complex grid, filters, backdrop filters, masks, clip paths, complex transforms, blend modes, text shadow, advanced pseudo-elements, canvas, WebGL, video, animations, and browser-specific text shaping.

## 6. Is A Hybrid Screenshot Strategy Needed?

Yes. The product should prefer editable nodes, but rasterize only unsupported subtrees or add cropped screenshot fallbacks when native Figma approximation is not good enough.

## 7. First MVP Vertical Slice

Controlled fixture page to Figma import:

```text
Plugin Shell -> Website Import Capability -> Parser Server -> Fixture IR
-> Root Frame -> Flex Auto Layout -> Text/Image nodes -> Result -> History/Restore
```

## 8. IR Design To Minimize Debt

Use versioned, serializable, Figma-independent Design IR with explicit layout, style, typography, asset, metadata, warning, and fallback fields. Keep asset binary data referenced or optional.

## 9. First Test Webpage

Use a local controlled fixture with header, nav, hero, primary button, image, three cards, simple footer, flexbox layout, and no iframe/canvas/WebGL/authentication.

## 10. Project Phase Split

Start with contracts, shell, registry, messaging, parser foundation, fixture parser, IR, layout inference, renderer, asset/font pipeline, result/history, then public-site integration and hardening.

## 11. Is Website Import Independent?

Yes. It is the first registered `IMPORT` capability and should not be embedded into Plugin Shell or shared navigation logic.

## 12. Are Core Changes Minimal For New Features?

Yes, if future features use the same capability contract and only add capability UI, implementation, metadata, and tests.

## 13. Can Font Loader And Mutation Engine Be Reused?

Yes. Font Loader is reused by Website Import, Font Replacer, UX Writing, and Localization. Mutation Engine is reused by any canvas-changing capability.

## 14. Can UI And State Stay Manageable?

Yes, if state is scoped per capability screen and shared shell state only contains registry metadata, settings, history summaries, and active operation status.

## 15. Does Future Scope Make MVP Too Large?

No, if future features remain documents and contracts only. MVP must not implement unused tabs, provider adapters, or workflow engines.

## 16. Can Website Import Results Be Reused Later?

Yes. Imported output is normal Figma nodes plus metadata/history, so Replace, Writing, Inspect, and QA capabilities can operate on it through Selection Engine and Node Scanner.

## 17. Is Independent Capability Testing Possible?

Yes. Each capability can be tested with mocked context services and contract fixtures.

## 18. Can History And Restore Be Shared?

Yes. Import restore removes generated nodes. Replace/Writing restore applies before-state snapshots. Both use shared history records.

## 19. Are Parser Server And AI Server Separate?

Yes. Parser Server handles website rendering and extraction. Future AI proxy handles provider calls, consent, key policy, and data minimization.

## 20. Does All-In-One Break Single Responsibility?

No, if "all-in-one" means one shell hosting independent capabilities. It would break down only if capabilities shared one global store, one execution module, or direct dependencies on each other.
