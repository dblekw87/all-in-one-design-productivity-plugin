# ADR-005: Use Shared Mutation And History Management

## Status

Accepted.

## Decision

All canvas-changing capabilities should use Mutation Engine and History Manager where practical. Website Import node creation is modeled as a mutation operation with created-node tracking.

## Rationale

Restore, progress, partial failure, and result reporting are common to Website Import, replacers, writing, and cleanup tools.

## Consequences

- Mutations need operation IDs.
- Partial success must be represented.
- Restore behavior can vary by capability but uses common history records.
