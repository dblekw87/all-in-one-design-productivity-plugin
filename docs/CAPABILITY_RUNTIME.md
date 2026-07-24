# Capability Runtime

## Purpose

Capability Runtime is the execution layer behind the typed Message Bus. It turns a capability run request into a validated, cancellable operation with progress and a normalized `CapabilityResult`.

Website Import is the first executable capability, but its real import behavior is still not implemented.

## Capability Contract

Capabilities in Plugin Main implement:

```ts
interface PluginCapability<TInput, TValidatedInput, TPreview, TResult extends CapabilityResult> {
  metadata: CapabilityMetadata;
  inputSchema: ZodType<TInput>;
  validate(context: CapabilityExecutionContext, input: TInput): Promise<CapabilityValidationResult<TValidatedInput>>;
  preview?(context: CapabilityExecutionContext, input: TValidatedInput): Promise<TPreview>;
  execute(context: CapabilityExecutionContext, input: TValidatedInput): Promise<TResult>;
  restore?(context: CapabilityExecutionContext, historyId: string): Promise<CapabilityResult>;
}
```

The contract lives in the Figma Plugin runtime, not in shared contracts, because it depends on Zod and runtime execution concepts. Serializable data structures remain in `packages/shared-contracts`.

## Metadata

Metadata remains serializable and safe for UI:

- `id`
- `category`
- `label`
- `description`
- `order`
- `enabled`
- `experimental`
- `supportsPreview`
- `supportsCancel`
- `supportsRestore`

UI uses metadata to display capabilities. It never receives capability functions or schemas.

## Input Schema

Every run request validates raw input with `inputSchema.safeParse()` before domain validation. Schema failures return `CAPABILITY_INPUT_INVALID`. Error details include validation paths and messages, not full input payloads.

## Domain Validation

`validate()` checks whether the capability can run in the current Figma state. Domain validation failure is a normal result path. `execute()` is not called when validation fails.

## Preview

`preview()` is optional. Website Import placeholder does not support preview in this step. Preview results must be JSON serializable and must not include Figma Node objects.

## Execute

`execute()` receives validated input and a `CapabilityExecutionContext`. It returns `CapabilityResult`. Execution exceptions are converted to `CAPABILITY_EXECUTION_FAILED`, unless the operation was aborted, in which case the result is `CAPABILITY_CANCELLED`.

## Execution Context

Current context includes:

- `operationId`
- `capabilityId`
- `selection`
- `signal`
- `reportProgress`
- `now`

Future services may be added only when needed: Node Scanner, Font Loader, Mutation Engine, History Manager, Settings Store, Asset Loader, and Parser API Client.

## Runner Lifecycle

```text
Capability lookup
-> enabled check
-> input schema validation
-> operation registration
-> execution context creation
-> domain validation
-> execute
-> result normalization
-> operation cleanup
```

The runner does not create message envelopes and does not post to UI. Message handlers call the runner.

## Operation Registry

Operation Registry tracks running operations by `operationId`:

- duplicate registration fails
- cancel calls `AbortController.abort()`
- completion removes the operation
- missing operations return explicit cancel results

There is no queue, scheduler, retry framework, or persistent operation storage.

## Cancellation

`CAPABILITY_CANCEL_REQUEST` calls the runner, which uses Operation Registry. Current cancel result is:

- running operation: `cancelled: true`
- missing operation: `cancelled: false`, with reason

Capabilities observe cancellation through `context.signal`.

## Progress

Capabilities call `context.reportProgress({ phase, progress, message })`. Progress is normalized to `0..1`; operation and capability IDs are added by the runtime. The reporter emits `CAPABILITY_PROGRESS_EVENT`.

Throttle is intentionally not implemented yet. It should be added when real long-running imports start emitting frequent updates.

## Completion

Current policy is:

- Run request promise returns the final `CapabilityResult`.
- Progress uses events.
- `CAPABILITY_COMPLETE_EVENT` remains in the shared contract for future async job flows.

This avoids duplicate completion state in the UI during MVP foundation work.

## Error Mapping

- missing capability: `CAPABILITY_NOT_FOUND`
- disabled capability: `CAPABILITY_DISABLED`
- schema failure: `CAPABILITY_INPUT_INVALID`
- domain failure: capability-provided failure, typically `CAPABILITY_VALIDATION_FAILED`
- execution exception: `CAPABILITY_EXECUTION_FAILED`
- abort: `CAPABILITY_CANCELLED`
- missing cancel target: `OPERATION_NOT_FOUND` semantics represented by cancel response reason in this step

## Website Import Placeholder

Website Import is registered as a real capability with an HTTPS URL schema. It performs no network request and returns `NOT_IMPLEMENTED` from execute.

## Adding A New Capability

1. Create metadata.
2. Create input schema.
3. Implement `validate()`.
4. Implement `execute()`.
5. Add capability-specific tests.
6. Register the capability in Plugin Main bootstrap.
7. Add UI only when the capability is enabled and intended to be visible.

## Forbidden Patterns

- Capability importing UI code.
- Capability posting Message Bus events directly.
- Capability importing Parser Server source.
- Returning functions, Figma Nodes, `Date`, `Error`, or non-serializable objects.
- Adding future capability placeholders to production registry.
- Adding workflow engines, queues, or persistent operation storage before they are needed.
