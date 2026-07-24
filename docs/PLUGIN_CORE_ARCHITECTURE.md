# Plugin Core Architecture

## Purpose

Plugin Core provides small shared services required by multiple capabilities. It must not know Website Import internals, parser details, AI providers, or future feature implementation logic.

## Plugin Shell

The shell owns:

- Startup and initialization.
- Capability registry construction.
- Message Bus binding.
- Shared service construction.
- UI bootstrapping.
- Error boundary and global plugin lifecycle.

The shell does not implement capability workflows.

## Plugin UI

The UI owns:

- Navigation.
- Forms and settings screens.
- Preview display.
- Progress display.
- Result and history display.

The UI does not create Figma nodes and does not directly call parser or AI services. It sends typed requests through the Message Bus.

## Plugin Main Thread

The main thread owns:

- Figma API calls.
- Capability execution.
- Selection reading.
- Font loading.
- Mutation and history.
- Node creation.

## Capability Contract

Each capability implements:

- Metadata.
- `validate(context, input)`.
- `preview(context, input)`.
- `execute(context, input)`.
- Optional `restore(context, historyId)`.

Capabilities should be independently testable with mocked core services.

## Capability Registry

The registry provides:

- `register`
- `get`
- `list`
- `listByCategory`

Registration validates duplicate IDs and category support. Website Import is the first registered executable capability. The registry returns metadata to UI-facing code and keeps implementation objects inside Plugin Main runtime.

## Capability Runner

Capability Runner owns the execution lifecycle:

- Capability lookup.
- Enabled check.
- Input schema validation.
- Operation registration.
- Execution context creation.
- Domain validation.
- Execution.
- Result normalization.
- Operation cleanup.

Message handlers call the runner. Capabilities do not depend on Message Bus or UI code.

## Selection Engine

Selection Engine normalizes current selection:

- Raw selected `SceneNode[]`.
- Text, frame, component, and instance subsets.
- Page ID.
- Selection version.

Website Import uses it minimally at first, but Replace, Writing, and Inspect capabilities will rely on it heavily.

## Node Scanner

Node Scanner provides controlled recursive traversal:

- Hidden node exclusion.
- Locked node policy.
- Instance traversal policy.
- Maximum depth.
- Maximum node count.
- Abort signal support.
- Type filters.

It returns scan results and warnings rather than throwing on partial traversal issues.

## Font Loader

Font Loader centralizes:

- `figma.loadFontAsync`.
- Font cache.
- Mixed font detection.
- Mapping rules.
- Fallback font selection.
- Failure reporting.

Website Import uses it for imported text. Font Replacer and UX Writing reuse the same rules.

## Mutation Engine

Mutation Engine wraps canvas changes:

- Batch execution.
- Progress callbacks.
- Partial success.
- Partial failure.
- Abort checks between chunks.
- Result reporting.
- Before/after state hooks for History Manager.

Website Import node creation should be modeled as a mutation operation with created-node tracking.

## History Manager

History records:

- `historyId`
- `capabilityId`
- `operationId`
- Changed and created node IDs.
- Before and after snapshots where practical.
- Started and completed times.
- Restore capability.
- Expiration policy.

For Website Import, restore removes generated nodes. For replace capabilities, restore can apply stored before-state snapshots.

## Result Reporter

Result Reporter builds common `CapabilityResult` objects:

- Counts.
- Warnings.
- Failures.
- Timing.
- Operation metadata.

Capability-specific details live in typed `details` payloads, not in the core result fields.

## Settings Store

Settings Store uses `figma.clientStorage` with:

- Schema version.
- Migrations.
- Namespaced settings.
- Parser Server URL.
- Font mapping.
- Viewport defaults.

Future AI settings must be added carefully and should not store raw provider keys in plaintext when avoidable.

## Message Bus

Message Bus centralizes request and response types:

- Typed envelopes with `messageId` and `correlationId`.
- Runtime validation at UI/Main boundaries.
- Initialize.
- Capability list.
- Run capability.
- Cancel capability.
- Scan selection.
- Selection changed events.

Message type strings are declared in one contract package.

Main Thread uses a central router and Map-based handler registry. UI uses a request client with pending request tracking and timeout handling.

## Dependency Rules

- Shell depends on Core and registered capabilities.
- Capabilities depend on contracts and core service interfaces.
- Core does not depend on capabilities.
- UI depends on message contracts and UI models.
- Parser Server does not depend on Figma Plugin API.
- IR does not depend on Figma API types.

## Adding Future Capabilities

To add a capability:

1. Implement capability contract.
2. Add UI panel for that capability.
3. Register metadata and implementation.
4. Add tests for validation, preview, execute, and restore if supported.

Core changes should be needed only when a truly shared service is missing.
