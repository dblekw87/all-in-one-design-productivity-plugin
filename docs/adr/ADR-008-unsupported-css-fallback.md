# ADR-008: Use Hybrid Fallback For Unsupported CSS

## Status

Accepted.

## Decision

Unsupported CSS is handled by a prioritized hybrid strategy: approximate, vectorize, rasterize affected element, omit with warning, create placeholder, or use cropped screenshot fallback.

## Rationale

Fully editable nodes are preferred, but some CSS features cannot be represented faithfully in Figma. Localized fallback preserves overall visual quality without flattening the whole page.

## Consequences

- Result reports must include fallback details.
- Renderer must support raster fallback layers.
- Fidelity varies by feature and must be transparent.
