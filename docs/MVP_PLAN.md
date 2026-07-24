# MVP Plan

## Recommended Development Order

1. Product and architecture documents.
2. Repository scaffold and build setup.
3. Shared contracts and Design IR schema.
4. Plugin Shell and typed Message Bus.
5. Capability Runtime, executable registry, runner, operation registry, and dummy capability tests.
6. Website Import capability skeleton.
7. Parser Server foundation and security gate.
8. Analyze API contract and fixture website foundation.
9. Playwright Browser Runtime foundation and fixture navigation.
10. Safe Browser Navigation boundary.
11. DOM Snapshot foundation.
12. Computed Style Snapshot foundation.
13. Geometry Evidence foundation.
14. Flexbox, block, grid layout evidence and rule-based layout inference.
15. Platform-independent sizing inference.
16. Asset Reference extraction.
17. Request-scoped binary asset resolution and security inspection.
18. Figma node renderer command model.
19. Main-thread mutation execution.
20. Font and asset pipeline.
21. Preview, progress, result report.
22. History and import removal.
23. Public test page integration.
24. Performance and security hardening.

## Completion Conditions By Phase

- Contracts: compile-time shared types and schema tests pass.
- Shell: plugin loads and lists Website Import from registry.
- Parser: fixture URL returns versioned IR.
- Analyze API: valid target returns a versioned response after request and target validation.
- Browser Runtime: controlled fixture navigation returns title, status, final URL, content type, viewport, and timing.
- Safe Navigation: browser requests are guarded before continuation and return a security report.
- Renderer: fixture IR creates editable root frame.
- Layout: fixture flex containers become Auto Layout.
- Assets: normal images become image paints.
- Text: text nodes are editable and fonts are loaded or substituted.
- History: created import can be removed through restore.

## Expected Directory Structure

```text
apps/
  figma-plugin/
  fixture-website/
  parser-server/
packages/
  capability-contracts/
  design-ir/
  plugin-core/
  website-import/
  test-fixtures/
docs/
```

Start with fewer packages if build setup slows progress, but keep the same logical boundaries.

## Test Strategy

- Unit tests for registry, settings migration, result reporter, and history.
- Contract tests for messages and IR schema.
- Parser tests against fixture HTML.
- Layout inference tests for flex, block, and simple grid.
- Renderer tests using command output before using Figma API directly.
- Security tests for blocked URLs and redirects.
- Parser security inspection route tests using fake DNS resolvers.
- Analyze route tests using injected target inspector and placeholder service.
- Browser runtime tests using controlled fixture navigation.
- Fixture website contract tests.
- Snapshot tests for repeated fixture imports.

## Fixture Page Conditions

The first fixture should include:

- Header.
- Navigation.
- Hero.
- Primary button.
- Text blocks.
- One image.
- Three repeated cards.
- Footer.
- Flexbox-focused layout.
- Simple grid section.
- No login, iframe, canvas, video, WebGL, or animation dependency.

## Major Risks

- Auto Layout inference may be visually wrong for mixed layout pages.
- Font substitution may cause text reflow.
- Large pages may exceed payload or node creation limits.
- Unsupported CSS may require too much raster fallback.
- Security requirements may complicate public URL handling.
- DNS rebinding must be rechecked at Browser navigation time, not only at request preflight.

## Priority

MVP quality depends first on controlled fixture success, not public-site breadth. Public sites should come after reliable parser, IR, renderer, result, and restore flows.

The parser foundation now includes Layout Evidence after DOM, Style, Geometry, and Snapshot Normalization. This evidence is diagnostic input for the next Layout Inference step and is not itself an Auto Layout or Design IR decision.

Step 13 adds rule-based Layout Inference with explicit source priority, candidate scoring, conflict handling, and fallback metadata. Step 14 adds independent width/height Sizing Inference with CSS source, parent/content relations, constraints, and intrinsic evidence. Step 15 adds reference-only Asset extraction. Step 16 adds request-scoped Binary Resolution with streaming limits, signatures, hashes, and conservative SVG checks. These remain platform-independent inputs to the later Design IR stage.

## After MVP

Recommended next capability: Font Replacer.

Reason: it reuses Selection Engine, Node Scanner, Font Loader, Mutation Engine, History, Result Reporter, and Settings without requiring Parser Server complexity. It validates the all-in-one architecture with a lower-risk second capability.

Next candidates:

1. Font Replacer.
2. Text Replacer.
3. Auto Layout Fixer.
4. UX Writing.

UX Writing should wait until privacy, AI proxy, consent, and selected-context policies are implemented.

## Explicit Non-Scope During MVP

- Future capability implementation.
- Generic workflow engine.
- Automatic component set creation.
- Full responsive constraints.
- Authenticated website import.
- AI provider integration.
Step 17 builds the platform-independent Design IR. Figma rendering remains a later step.
## Step 18

Asset Transfer Session Foundation: 검증된 Asset Binary를 요청 단위 TTL Session과 Manifest/Authorization Header 기반 Endpoint로 전달한다. Figma Renderer와 Persistent Asset Storage는 후속 범위다.
# Step 19 Renderer Runtime

The Plugin now has a validated Design IR render foundation with adapter-bounded factories, placeholders, progress, cancellation, and rollback. Asset transfer consumption and complete Figma rendering remain subsequent steps.

# Step 20 Raster Assets

The Plugin now validates session-scoped raster transfers, verifies bytes and SHA-256 with Web Crypto, caches image hashes per render, and applies limited Image Paints through the Figma adapter. SVG conversion, fonts, and full background layering remain deferred.
