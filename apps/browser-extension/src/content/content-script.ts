import type { ExtensionRequest, ExtensionResponse } from "../contracts/messages.js";
import "../shared/chrome-types.js";
import { collectPageMetadata } from "./page-metadata.js";
import { cancelBrowserCapture, runBrowserCapture } from "../capture/index.js";

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const request = message as Partial<ExtensionRequest>;
  if (request.type === "PING") {
    sendResponse({ type: "PING", payload: { ok: true, version: "content-script" } } satisfies ExtensionResponse);
    return false;
  }
  if (request.type === "GET_PAGE_METADATA") {
    sendResponse({
      type: "GET_PAGE_METADATA",
      payload: { ok: true, metadata: collectPageMetadata() }
    } satisfies ExtensionResponse);
    return false;
  }
  if (request.type === "RUN_BROWSER_CAPTURE") {
    const payload = request.payload;
    if (!payload || !("sessionId" in payload) || !("tabId" in payload)) return false;
    runBrowserCapture({
      sessionId: payload.sessionId,
      tabId: payload.tabId,
      captureMode: "BROWSER_TAB",
      options: {
        includeHidden: false,
        includePseudo: true,
        includeInlineSvg: true,
        includeAssets: true,
        maxNodes: 5000,
        maxDepth: 80,
        ...payload.options
      }
    })
      .then((result) => {
        sendResponse({ type: "RUN_BROWSER_CAPTURE", payload: result } satisfies ExtensionResponse);
      })
      .catch(() => {
        sendResponse({
          type: "RUN_BROWSER_CAPTURE",
          payload: {
            status: "FAILED",
            warnings: [],
            metrics: {
              nodeCount: 0,
              elementCount: 0,
              textNodeCount: 0,
              styleCount: 0,
              geometryCount: 0,
              pseudoCount: 0,
              inlineSvgCount: 0,
              assetReferenceCount: 0,
              skippedNodeCount: 0,
              hiddenCount: 0,
              flexContainerCount: 0,
              gridContainerCount: 0,
              durationMs: 0,
              truncated: false
            },
            progress: [],
            error: { code: "CAPTURE_DOM_FAILED", message: "Browser capture failed.", retryable: true }
          }
        } satisfies ExtensionResponse);
      });
    return true;
  }
  if (request.type === "CANCEL_CAPTURE") {
    const payload = request.payload;
    if (!payload || !("sessionId" in payload)) return false;
    cancelBrowserCapture(payload.sessionId);
    sendResponse({ type: "CANCEL_CAPTURE", payload: { ok: true, sessionId: payload.sessionId, cancelled: true } } satisfies ExtensionResponse);
    return false;
  }
  return false;
});
