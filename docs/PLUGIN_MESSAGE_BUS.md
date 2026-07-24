# Plugin Message Bus

## Purpose

The Message Bus is the only communication path between Figma Plugin UI and Figma Plugin Main Thread. UI components do not call `parent.postMessage` directly. Main Thread does not handle raw messages in `index.ts`.

## Message Envelope

Every request, response, and event uses a shared envelope from `packages/shared-contracts`:

```ts
interface MessageEnvelope<TType extends string, TPayload> {
  protocolVersion: "1.0";
  messageId: string;
  correlationId?: string;
  type: TType;
  timestamp: string;
  payload: TPayload;
}
```

Rules:

- `messageId` is unique per message.
- Response `correlationId` equals the original request `messageId`.
- Events may omit `correlationId`.
- `timestamp` is an ISO string.
- Payloads must be JSON serializable.
- Figma Node objects, `Date` objects, and raw `Error` objects are not sent across the boundary.

## Request, Response, Event Types

Requests:

- `PLUGIN_INITIALIZE_REQUEST`
- `CAPABILITY_LIST_REQUEST`
- `SELECTION_SCAN_REQUEST`
- `CAPABILITY_RUN_REQUEST`
- `CAPABILITY_CANCEL_REQUEST`

Responses:

- `PLUGIN_INITIALIZE_RESPONSE`
- `CAPABILITY_LIST_RESPONSE`
- `SELECTION_SCAN_RESPONSE`
- `CAPABILITY_RUN_RESPONSE`
- `CAPABILITY_CANCEL_RESPONSE`
- `PLUGIN_ERROR_RESPONSE`

Events:

- `PLUGIN_READY_EVENT`
- `SELECTION_CHANGED_EVENT`
- `CAPABILITY_PROGRESS_EVENT`
- `CAPABILITY_COMPLETE_EVENT`

Message strings are declared once in `packages/shared-contracts`.

## Request Lifecycle

```text
UI Request Client
-> create envelope with messageId
-> parent.postMessage({ pluginMessage })
-> Main Thread Router validates request
-> Handler Registry resolves handler by type
-> Handler returns typed response
-> Router attaches correlationId
-> figma.ui.postMessage(response)
-> UI Request Client resolves matching pending request
```

## Runtime Validation

`packages/shared-contracts` exports Zod schemas for requests, responses, events, capability metadata, serializable errors, capability results, and selection summaries.

Invalid UI-to-main messages return `PLUGIN_ERROR_RESPONSE` with `INVALID_MESSAGE`. Invalid main-to-UI messages are ignored by the UI client and do not crash the UI.

## Timeout

The UI Request Client applies a default 10 second timeout to requests. Timeout rejects the pending request with:

```text
MESSAGE_TIMEOUT
```

Website Import parser timeouts are separate and will be defined with Parser Server import endpoints.

## Cancel

`CAPABILITY_CANCEL_REQUEST` is defined around `operationId`.

`CAPABILITY_CANCEL_REQUEST` is connected to the Capability Runner and Operation Registry. Current short-lived placeholder operations usually complete before cancellation, so missing operations return `cancelled: false`.

## Error Contract

Errors sent through the bus use `SerializableError`:

```ts
interface SerializableError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
}
```

Stack traces are not sent to UI payloads.

## Selection Event

Main Thread subscribes to Figma `selectionchange` and emits `SELECTION_CHANGED_EVENT` with `SelectionSummary`.

`SelectionSummary` contains counts, node types, page ID, version, and limited node identity fields. It does not include SceneNode objects, full document trees, or full text contents.

Identical selection signatures are skipped to avoid repeated events. High-frequency event throttling may be added when selection scanning becomes heavier.

## Handler Registration

Main Thread handlers are registered through a Map-based registry. Duplicate handler registration fails immediately. Unsupported request types return:

```text
UNSUPPORTED_MESSAGE_TYPE
```

Current handlers:

- initialize
- capability list
- selection scan
- capability run through Capability Runner
- capability cancel through Capability Runner

## Adding A New Message

1. Add the message type to `packages/shared-contracts`.
2. Add payload and envelope types.
3. Add or update Zod schema.
4. Add shared contract tests.
5. Add a Main Thread handler if it is a request.
6. Register the handler in Main Thread bootstrap.
7. Use the UI Request Client or event subscription from UI code.

## Forbidden Patterns

- Declaring message type strings in UI or Main files.
- Sending Figma Node objects to UI.
- Sending raw `Error` instances.
- Calling Parser Server directly from UI components.
- Adding one large switch in `main/index.ts`.
- Adding future capability placeholder tabs.
