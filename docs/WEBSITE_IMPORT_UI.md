# Website Import UI Integration

## Purpose

The Figma Plugin UI provides the user-facing entry point for importing a public website into the Figma canvas. The UI owns input, progress, cancellation, and result presentation. It does not import Parser Server source code or retain asset tokens.

## Execution Flow

```text
URL Input
→ Main Thread Capability Message
→ Parser Server POST /v1/imports/analyze
→ Analyze Response Validation
→ Design IR and Asset Transfer Context
→ Renderer Runtime
→ Figma Node Result
```

The Main Thread performs the Parser request because the Parser Server and Figma Plugin are separate applications. The UI only communicates through the typed Plugin Message Bus.

## URL Policy

HTTPS URLs are accepted for normal imports. HTTP is accepted only for local development hosts (`localhost`, `127.0.0.1`, and `::1`). The Parser Server remains responsible for SSRF and target security validation. URLs are not written to logs or error details.

## Parser Configuration

The single development default is `http://localhost:4000` in the Plugin Main Thread configuration. A runtime `__AIO_PARSER_SERVER_URL__` value may override it after the same scheme and host policy validation. Production must use an HTTPS Parser origin.

## UI States

The Website Import workflow exposes:

```text
IDLE → VALIDATING → ANALYZING → RENDERING → COMPLETED
                                      ↘ FAILED
                                      ↘ CANCELLED
```

Duplicate runs are disabled while an operation is active. Progress messages contain only phase, percentage, and safe user-facing text. They never contain tokens, binary data, raw SVG, or full request details.

## Cancellation

The UI sends `CAPABILITY_CANCEL_REQUEST` for the active operation. The existing Capability Runtime propagates the AbortSignal to the Analyze fetch and Renderer Runtime. Renderer rollback and asset transfer-session cleanup remain owned by the Main Thread runtime.

## Results and Errors

The UI displays created node count, placeholder count, warning count, and a normalized error code. Internal stacks, credentials, access tokens, asset URLs, binary data, and raw SVG are not displayed.

Text/font warnings are surfaced through the same result warning path. Progress may include font resolution, font loading, TextNode creation, and typography application phases, but it never includes full text content or available font lists.

## Tool Tabs

Website Import is the active tool. Font Replacer and UX Writing are represented as extension tabs with a disabled/coming-soon state. Their capability implementations are separate future work and are not mixed into Website Import.

## Boundary

This step connects the existing Analyze API, Design IR, Asset Transfer Session, and Renderer Runtime. Frame layout progress and warnings use the existing result path; CSS, URL, token, and full text content are not exposed. Parser logic and new asset resolution behavior remain outside the UI.
