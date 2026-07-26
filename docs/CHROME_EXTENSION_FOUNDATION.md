# Chrome Extension Foundation

Step 27 creates the Chrome Extension Runtime foundation. It does not implement DOM, style, geometry, screenshot, asset, cookie, storage-sync, parser-upload, semantic, or renderer work.

Renderer code remains Design IR-only. The extension produces metadata-only Universal Capture Snapshot envelopes so later capture steps can fill DOM, style, geometry, screenshot, and asset payloads without changing renderer boundaries.

## Architecture

The extension lives in `apps/browser-extension` and is a separate workspace package.

Runtime flow:

```text
Popup or Background Message
-> Typed Message Bus
-> ExtensionRuntime
-> BrowserExtensionCaptureProvider
-> CaptureSnapshot metadata envelope
```

## Manifest

Manifest V3 is defined at `apps/browser-extension/manifest.json` with:

- `activeTab`
- `tabs`
- `storage`
- `scripting`
- `http://*/*`
- `https://*/*`
- localhost development origins
- placeholder icons generated at build time

The loadable extension root is `apps/browser-extension/dist`. Build output rewrites Chrome-facing paths so `dist/manifest.json` points to files relative to that extension root:

- `src/background/service-worker.js`
- `src/content/content-script.js`
- `popup.html`
- `icons/icon-16.png`
- `icons/icon-48.png`
- `icons/icon-128.png`

## Background

The background service worker initializes runtime state, responds to ping/info/status messages, resolves the active tab, injects the content script when needed, and routes capture requests.

## Content Script

The content script does not capture DOM. It only returns browser metadata:

- URL
- title
- viewport size
- document size
- scroll position
- device pixel ratio
- language
- theme

## Popup

The popup shows version, connection status, runtime status, current URL/title/tab, capture mode, metadata, and Capture/Diagnostics/Settings buttons. Capture currently calls the message bus and returns metadata-only snapshot information.

## Runtime

`ExtensionRuntime` manages states:

- `INITIALIZING`
- `READY`
- `BUSY`
- `CAPTURING`
- `ERROR`
- `DISCONNECTED`

## Capture Session

Extension capture sessions track:

- `sessionId`
- `tabId`
- `captureMode`
- `status`
- `createdAt`
- `startedAt`
- `endedAt`

## Message Bus

Typed messages:

- `PING`
- `GET_RUNTIME_STATUS`
- `GET_PAGE_METADATA`
- `START_CAPTURE`
- `CANCEL_CAPTURE`
- `GET_EXTENSION_INFO`

## Chrome Load Checklist

To smoke test the extension in Chrome:

1. Run `corepack pnpm --filter @aio/browser-extension build`.
2. Open `chrome://extensions`.
3. Enable Developer Mode.
4. Click Load unpacked.
5. Select `apps/browser-extension/dist`.
6. Confirm the extension registers as `AIO Browser Capture`.
7. Open the popup and confirm status fields render.
8. Confirm the service worker is listed for the extension.
9. Open an HTTP or HTTPS page and confirm the content script is registered by requesting page metadata from the popup.

Expected Step 27 behavior:

- Extension registration succeeds.
- Popup opens from `popup.html`.
- Background service worker loads from `src/background/service-worker.js`.
- Content script loads from `src/content/content-script.js`.
- Capture returns a metadata-only snapshot with `CAPTURE_NOT_IMPLEMENTED`.

Step 28 changes capture behavior: the same extension foundation now routes `START_CAPTURE` through the background service worker into the content script, which builds a Universal Capture Snapshot v1.0 from the active tab. Screenshot, parser upload, and renderer integration remain deferred.

## Future Capture

Step 28 can add actual Browser Tab DOM capture behind the same runtime/provider boundary. Later steps can add style, geometry, screenshot, assets, pseudo elements, inline SVG, parser upload, and full snapshot transport.

## Future Screenshot

Screenshot capture should be added as an explicit snapshot payload producer, not as a renderer input.

## Future DOM

DOM capture should fill the `CaptureSnapshot.dom` field and continue through the existing snapshot-to-analysis pipeline before Design IR is produced.
