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

## Future Capture

Step 28 can add actual Browser Tab DOM capture behind the same runtime/provider boundary. Later steps can add style, geometry, screenshot, assets, pseudo elements, inline SVG, parser upload, and full snapshot transport.

## Future Screenshot

Screenshot capture should be added as an explicit snapshot payload producer, not as a renderer input.

## Future DOM

DOM capture should fill the `CaptureSnapshot.dom` field and continue through the existing snapshot-to-analysis pipeline before Design IR is produced.
