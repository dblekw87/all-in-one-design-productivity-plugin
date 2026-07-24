# ADR-004: Introduce Design IR

## Status

Accepted.

## Decision

Use a versioned, serializable Design Intermediate Representation between Parser Server and Figma node rendering.

## Rationale

Directly passing DOM/CSS or Figma API-shaped data would tightly couple runtimes. IR supports validation, snapshots, fixture tests, future inspection, component detection, and renderer evolution.

## Consequences

- IR schema must be versioned.
- Assets should be referenced rather than always embedded.
- Figma API types must not leak into IR.
