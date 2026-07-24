# Figma Asset Client

## Purpose

Step 20 transfers only verified raster binaries from a Parser import session to the Figma Plugin Main Thread. The client validates the manifest, fetch response, byte length, media type, and SHA-256 before creating a Figma image resource.

SVG remains a placeholder path. Font loading, SVG vector conversion, image resizing, and persistent caches are deferred.

## Runtime Context

The session ID, access token, expiry, and manifest are held in runtime memory while rendering. The token is sent only in an Authorization header. It is not placed in URLs, plugin data, render results, logs, or binary metadata.

The configured Parser origin is trusted configuration. Manifest paths must be relative to the configured origin, use the import API prefix, and contain no traversal or external scheme.

## Manifest and Selection

The renderer builds `assetId` and `bindingId` maps once. It downloads only Design IR bindings with `RASTER_IMAGE` strategy and `RASTER_BINARY` manifest entries. Unused manifest entries and SVG bindings are not requested.

## Verification

The HTTP client uses `GET`, `credentials: omit`, `cache: no-store`, `redirect: error`, and an Authorization header. It checks status 200, raster Content-Type, optional Content-Length, actual byte length, Plugin byte limits, and Web Crypto SHA-256. Parser validation is not treated as a substitute for Plugin validation.

The shared contract stores SHA-256 as 64 lowercase hexadecimal characters. Binary bytes are never serialized into the Design IR, capability result, or UI message.

## Cache and Image Creation

The request-scoped asset cache shares in-flight downloads by asset ID and removes failed promises. Figma image hashes are cached by SHA-256, so identical binaries call `figma.createImage()` once per render. The production image adapter is the only module that accesses Figma image and `fills` APIs; tests use a fake adapter.

`IMAGE` nodes are Frames with an Image Paint when a verified binding is available. Missing or failed assets become placeholders by default. `FAIL_RENDER` can make an asset failure fatal. `object-fit` maps to the limited Image Paint scale modes; exact object-position cropping is deferred.

Single raster background layers are applied to Frame fills. Multiple layers, gradients, repeat, blend mode, and precise background positioning remain warnings or later work.

## Cancellation and Cleanup

AbortSignal is passed to fetches and image preparation. On success, failure, or cancellation, the import session is deleted when a transfer context exists. Cleanup failures are warnings and do not replace the original render result. Runtime caches are cleared after cleanup.

## Runtime Constraints

The Plugin bundle does not import Node crypto, Buffer, filesystem modules, or Parser Server source. SHA-256 uses Web Crypto. Access tokens and raw binary are not persisted.
## SVG Extension

The HTTP Asset Client also accepts `SANITIZED_SVG` entries with `image/svg+xml`. It applies the same session, response, byte-length, and SHA-256 checks as Raster assets. UTF-8 decoding and assertion-level SVG preflight are handled by the SVG runtime cache; full sanitization remains a Parser responsibility.
