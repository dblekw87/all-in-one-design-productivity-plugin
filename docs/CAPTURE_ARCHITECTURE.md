# Capture Architecture

Step 25 introduces a capture-provider foundation for a broader html.to.design-style import platform. The renderer is intentionally not expanded in this step.

## Capture Modes

Supported contract values are:

- `PUBLIC_URL`: public HTTPS URL analyzed by the Parser Server browser runtime.
- `BROWSER_TAB`: future browser-extension tab capture.
- `LOCAL_HTML`: future local HTML payload capture.
- `LOCAL_ZIP`: future zipped site/package capture.
- `LOCALHOST`: future local dev server capture.
- `SNAPSHOT`: future prebuilt DOM/style/geometry snapshot import.
- `UNKNOWN`: defensive fallback for unclassified capture sources.

Only `PUBLIC_URL` is implemented in Step 25. Other modes are valid contract values but return `CAPTURE_MODE_NOT_SUPPORTED` until a provider is added.

## Provider Boundary

Parser capture providers expose:

```ts
interface CaptureProvider {
  capture()
  validate()
  supports()
}
```

`validate()` checks whether the input is acceptable for the provider. `capture()` returns a normalized `CaptureSource` and the validated target needed by the current analyzer path. For `PUBLIC_URL`, this wraps the existing public-target security validation.

## Analyze Integration

`AnalyzeWebsiteRequest` now accepts an optional `captureMode`, defaulting to `PUBLIC_URL`. The existing `capture.mode` field remains the viewport capture strategy (`VIEWPORT` or `FIXED_HEIGHT`) and is not reused for source type.

`AnalyzeWebsiteResponse` can include `captureSource` so downstream UI and diagnostics can explain where the imported design came from without changing Design IR or renderer contracts.
