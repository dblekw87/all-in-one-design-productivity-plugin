# ADR-007: Prefer Component Candidates Over Automatic Components

## Status

Accepted.

## Decision

MVP records repeated UI patterns as Component Candidates instead of automatically creating Figma components or component sets.

## Rationale

Automatic component creation can damage hierarchy, create false abstractions, and surprise designers. Candidate metadata and reports are safer and still useful.

## Consequences

- Candidate detection can be improved independently.
- Users may opt into component creation in a later capability.
- MVP avoids complex component set logic.
