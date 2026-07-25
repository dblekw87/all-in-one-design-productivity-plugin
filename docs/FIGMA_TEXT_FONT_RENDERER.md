# Figma Text Font Renderer

## Purpose

Step 22 changes Design IR `TEXT` rendering from placeholder frames to editable Figma `TextNode` creation. The renderer supports single-style text only: one resolved font, one size, one fill, one alignment set, and bounded geometry per IR node.

## Font Resolution

CSS font families are parsed as a candidate list, with quotes, whitespace, empty values, and duplicates removed. The parser preserves display names and creates normalized keys for matching.

Next.js internal font names such as `__Inter_a1b2c3` are heuristically normalized by removing the leading marker, dropping the trailing hash-like suffix, and converting underscores to spaces. This is best-effort only and reports a warning when used.

Generic families are never passed to `loadFontAsync()`. They map to available Figma fonts through bounded candidates:

- `sans-serif`: Inter, Arial, Roboto, Noto Sans
- `serif`: Times New Roman, Georgia, Noto Serif
- `monospace`: Roboto Mono, Source Code Pro, Courier New
- `system-ui`: Inter, Arial, Roboto
- `cursive` and `fantasy`: system fallback only

The resolver lists available Figma fonts once per render session through the adapter, then scores candidates by family, style, weight, italic preference, generic fallback, system fallback, and first available fallback. CSS weights map to Figma style aliases such as Regular, Medium, Semi Bold, Bold, Black, and italic combinations.

## Font Loading

`characters` are applied only after the resolved font is loaded. Font loads are cached per render session by normalized family/style key. Concurrent requests share the same promise, failed loads are removed from cache, and the cache is cleared when rendering finishes.

## TEXT Factory

The factory validates text input, resolves and loads the font, creates a Figma `TextNode`, registers it in the render session, sets `fontName`, applies `characters`, typography, auto resize, geometry, visibility, opacity, and plugin data, then lets the existing runtime append it to the parent and record the IR/Figma mapping.

Plugin data is limited to:

- `aio:irNodeId`
- `aio:sourceNodeId`
- `aio:renderType = TEXT`
- `aio:fontSource = EXACT | FALLBACK`

Full text content, URLs, tokens, font inventories, and error stacks are not stored.

## Typography Mapping

Supported mappings:

- font size with minimum and maximum clamps
- solid RGB text color and opacity
- horizontal alignment: left, center, right, justify, start, end
- vertical alignment: default top, with center/bottom support when explicit evidence exists
- line height: auto or pixels, with percentage/unitless support in the mapper
- letter spacing: pixels, percent, normal, and em-to-pixel conversion
- text decoration: none, underline, line-through
- text case: original, upper, lower, title
- visibility and opacity from the IR node

Unsupported gradients, image fills, multiple fills, blend modes, rich ranges, text shadows, and locale-sensitive case conversion remain deferred.

## Auto Resize And Geometry

Content-sized text uses `WIDTH_AND_HEIGHT`. Fixed or stretch width uses `HEIGHT` and preserves IR width where possible. Geometry is applied only for finite positive bounds. The policy favors measured IR bounds over exact CSS text layout reproduction.

## Failure, Progress, Cancellation, Rollback

Default text policy is font fallback, then placeholder when no usable font can be loaded. `FAIL_RENDER` can make text failure fatal so the existing renderer rollback removes only session-created nodes. Text nodes are registered immediately after creation so failures before parent append still roll back.

Progress stages added for text are `RESOLVING_FONTS`, `LOADING_FONTS`, `CREATING_TEXT_NODES`, and `APPLYING_TYPOGRAPHY`. Payloads use IR node IDs and counts only, never full text.

Cancellation is checked around font resolution, font loading, TextNode creation, character application, typography, and geometry. `loadFontAsync()` itself is not abortable, so cancellation is checked again after it resolves.

## Runtime Constraints

The Plugin does not use `node:fs`, `node:path`, `node:crypto`, `Buffer`, Parser Server source imports, DOM Font APIs, font binary fetches, or `@font-face` downloads. Production Figma calls are isolated in the Figma text adapter.

## Deferred Work

Rich text ranges, mixed fonts inside one node, `setRange*` APIs, variable font axes, full white-space/overflow/RTL behavior, text paths, strokes, shadows, gradients, component generation, and design token extraction remain outside Step 22.

## Smoke Test

Manual Figma Desktop smoke testing should run the built plugin against `http://localhost:3000/import-test` or the current local import fixture and verify ordinary, bold, italic, centered, fixed-width, multiline, generic-family, missing-family, and Next-font text. If a Figma host is unavailable, automated tests and fixture readiness are the smoke-test preparation artifact.
