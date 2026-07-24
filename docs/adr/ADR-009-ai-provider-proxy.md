# ADR-009: Plan For Future AI Provider Proxy

## Status

Accepted for future implementation.

## Decision

Future AI-backed capabilities should use a dedicated AI proxy or controlled provider integration rather than hardcoding provider keys in plugin UI.

## Rationale

UX Writing and localization may send selected design content outside Figma. Data scope, consent, API key handling, logging, and retention need a dedicated boundary.

## Consequences

- MVP does not implement AI provider adapters.
- Parser Server and AI proxy remain separate responsibilities.
- Future AI capabilities must define data minimization policies.
