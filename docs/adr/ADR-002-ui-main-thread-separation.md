# ADR-002: Separate Plugin UI And Main Thread

## Status

Accepted.

## Decision

Plugin UI handles user interaction, preview display, progress, results, history screens, and settings. Plugin Main Thread handles Figma API access, node creation, mutation, selection, font loading, history recording, and capability execution.

## Rationale

Figma node creation belongs in the main thread. Keeping UI free of Figma mutation logic makes capabilities testable and keeps external service calls away from components.

## Consequences

- All communication uses typed Message Bus contracts.
- UI components do not call Parser Server directly.
- Main Thread coordinates capability services.
