# ADR-001: Adopt Capability Architecture

## Status

Accepted.

## Decision

Implement plugin features as independently registered capabilities with shared contracts for metadata, validation, preview, execution, progress, result, and optional restore.

## Rationale

Website Import is the first feature, but the product direction requires Replace, Writing, Inspect, and Generate capabilities later. A capability boundary prevents feature logic from accumulating inside Plugin Shell, Message Bus, or UI navigation.

## Consequences

- New features must implement the capability contract.
- Shared services must live in Plugin Core.
- Core must not depend on individual capabilities.
