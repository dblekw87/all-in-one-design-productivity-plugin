# ADR-006: Choose Monorepo With Conservative Package Boundaries

## Status

Accepted.

## Decision

Use a monorepo because the plugin and Parser Server share contracts, IR, test fixtures, and normalization logic. Keep package count conservative during MVP.

## Rationale

The project has multiple runtime targets from the beginning. A monorepo reduces contract drift while preserving explicit boundaries.

## Consequences

- Build setup is more complex than a single app.
- Shared contracts can be tested once and consumed by all runtimes.
- Modules should not be split into packages until a real cross-runtime need exists.
