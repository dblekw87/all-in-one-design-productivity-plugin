# DOM To Figma Mapping

## HTML Element Mapping

- `body`, `main`, `section`, `header`, `footer`, `nav`, `article`, `aside`: `FrameNode`.
- `div`: `FrameNode` when it has layout, background, border, children, or semantic role.
- `p`, `span`, headings, labels, links with text: `TextNode` or text child inside a frame when mixed with decorations.
- `button`, `a[role=button]`: `FrameNode` with child `TextNode`.
- `img`, `picture`: rectangle/frame with image paint.
- Inline `svg`: SVG node via `figma.createNodeFromSvg` when safe, otherwise raster fallback.
- Pseudo-elements: generated text/frame/vector when simple, raster fallback when complex.

## CSS Property Mapping

Mapping은 DOM Snapshot, Style Snapshot, Geometry Evidence가 수집한 사실 데이터를 입력으로 사용한다. Geometry Evidence는 rect와 box metrics만 제공하며, 이 단계에서 Auto Layout이나 HUG/FILL/FIXED를 판정하지 않는다.

- `background-color`: solid fill.
- `background-image`: image paint, gradient fill when supported, or raster fallback.
- `linear-gradient`, `radial-gradient`: Figma gradient approximation when simple.
- `color`: text fill.
- `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`: text properties through Font Loader.
- `text-align`: text horizontal alignment.
- `border`: strokes.
- `border-radius`: corner radius or independent radii.
- `box-shadow`: drop shadow effect approximation.
- `opacity`: node opacity.
- `transform`: rotation/scale approximation; complex transforms warn or rasterize.
- `object-fit`, `object-position`: image crop/fill transform approximation.
- `overflow`: clip content where supported.
- `width`, `height`, min/max sizes: sizing hints.
- `padding`, `gap`: Auto Layout padding and item spacing.
- `margin`: converted into parent gap/padding or absolute offsets; avoid double counting.
- `flex`: Auto Layout sizing and alignment.
- `grid`: nested Auto Layout or limited absolute positioning.
- `position`: absolute/fixed/sticky strategy.
- `mask`, `filter`, `backdrop-filter`, `clip-path`, complex `mix-blend-mode`, `text-shadow`: fallback candidates.
- `text-transform`, `text-decoration`, `white-space`, `word-break`, `overflow-wrap`: applied where Figma supports or warning recorded.

## Flexbox To Auto Layout

- `display:flex` or `inline-flex`: Auto Layout candidate.
- `flex-direction: row`: horizontal.
- `flex-direction: column`: vertical.
- `gap`, `row-gap`, `column-gap`: item spacing or wrap spacing.
- `justify-content`: primary axis alignment.
- `align-items`: counter axis alignment.
- Padding maps directly to frame padding.
- `flex-grow > 0` with available parent size maps to `FILL`.
- Explicit fixed width/height maps to `FIXED`.
- Content-sized text or intrinsic image maps to `HUG` when constraints allow.
- `order` changes child order before rendering.
- `align-self` may require wrapping child in a frame or warning.
- `flex-wrap` uses Figma wrap if available; otherwise nested row frames or warning.

## Block Layout Inference

For non-flex containers:

- Sort visible children by rendered position and z-index.
- Detect vertical stacks when x ranges align and y gaps are consistent.
- Detect horizontal rows when y ranges align and x gaps are consistent.
- Convert consistent spacing to gap.
- Convert parent-to-child offsets to padding.
- Normalize collapsed margins to one spacing value.
- Use absolute positioning only when flow confidence is low.

## Grid Strategy

- One-dimensional grids become horizontal or vertical Auto Layout.
- Simple repeated cards become nested row/column frames.
- `auto-fit`, `auto-fill`, and `minmax` are resolved from computed geometry at selected viewport.
- Spanning items are kept in nested frames if possible.
- Dense or overlapping grid uses absolute positioning with warning.
- Complex grid should not force the full page into absolute layout.

## Position Strategy

- `absolute`: place inside nearest positioned parent with absolute coordinates.
- `fixed`: place relative to viewport root frame.
- `sticky`: use rendered position for selected viewport and record warning.
- Decorative badges and floating buttons can remain absolute inside editable parents.
- z-index determines layer order within stacking context.

## HUG, FILL, FIXED Algorithm

Use CSS plus geometry:

- Explicit pixel width/height and no flex growth: `FIXED`.
- Flex child with positive grow and parent free space: `FILL`.
- Text or intrinsic content with auto size: `HUG`.
- Percent width in a flex row: prefer `FILL` if it tracks parent, otherwise fixed computed size with warning.
- Min/max constraints are recorded in metadata because Figma support is limited.

## Layout Confidence Score

Score layout inference from 0 to 1 using:

- CSS display match.
- Child alignment consistency.
- Gap consistency.
- Padding consistency.
- Overlap absence.
- DOM order matching visual order.
- Low use of absolute positioning.

High confidence renders Auto Layout. Medium confidence renders nested frames with warnings. Low confidence uses absolute positioning or raster fallback for the problematic subtree.

## Unsupported CSS Fallback Priority

1. Approximate with native Figma properties.
2. Convert simple vector/SVG representation.
3. Rasterize only the affected element.
4. Omit property with warning.
5. Create visual placeholder.
6. Add cropped screenshot fallback layer for the affected region.

## Text And Font Rules

- Load fonts before setting text properties.
- Preserve rich text segments when detected.
- Map numeric weights to Figma styles through font metadata and mapping rules.
- Use language-aware fallback for Korean, English, Japanese, Chinese where configured.
- Record font substitutions in result.

## Image And SVG Rules

- Resolve actual rendered image from `currentSrc`.
- Preserve aspect ratio.
- Approximate object fit and position.
- Sanitize SVG before importing.
- Remove scripts and event attributes.
- Use placeholders for failed downloads.

## Component Candidate Rules

MVP does not auto-create components. It records candidates using:

- DOM structure similarity.
- Style signatures.
- Repeated child structure.
- Size and spacing similarity.
- Slot differences in text/images.
- Repetition count.

Candidates appear in metadata and result report.

## Role-Based Naming

Names combine semantic role, tag, visible label, and pattern:

- `Header`
- `Navigation`
- `Hero Section`
- `Primary Button / Get Started`
- `Card / Pricing`
- `Footer`

Avoid names that are only raw HTML tags.
