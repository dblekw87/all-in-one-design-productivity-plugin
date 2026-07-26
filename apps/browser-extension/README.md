# AIO Browser Extension

Chrome Extension Runtime foundation for browser-tab capture.

Step 27 creates the extension runtime, message bus, content-script metadata bridge, popup UI, session management, diagnostics, and a metadata-only `BrowserExtensionCaptureProvider`.

This step does not implement DOM capture, style capture, geometry capture, screenshots, assets, cookies, parser upload, or renderer changes.

## Build

```bash
corepack pnpm --filter @aio/browser-extension build
```

Load `apps/browser-extension` as an unpacked Chrome extension after building. The root `manifest.json` references compiled files in `dist/`.
