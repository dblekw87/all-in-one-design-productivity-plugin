# ADR-010: Expand Navigation From Capability Metadata

## Status

Accepted.

## Decision

Navigation should be built from enabled capability metadata plus fixed shared sections. MVP exposes Import, History, and Settings only.

## Rationale

The product will grow, but empty future tabs create noise. Metadata-driven navigation lets new features appear without rewriting shell logic.

## Consequences

- Capabilities must include UI metadata.
- Disabled capabilities are hidden.
- Shell navigation remains category-based and small.
