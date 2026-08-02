import type { BrowserCaptureOptions, BrowserCaptureResult, BrowserCaptureSummary } from "../capture/index.js";
import { browserCaptureError, summarizeBrowserCaptureResult } from "../capture/index.js";
import type { BrowserPageMetadata, ExtensionRequest, ExtensionResponse } from "../contracts/messages.js";
import "../shared/chrome-types.js";
import { extensionConfig } from "../shared/config.js";
import { collectDiagnostics, getCurrentTab } from "../runtime/diagnostics.js";
import { createMessageError, isExtensionRequest } from "../runtime/message-bus.js";
import { RuntimeManager } from "../runtime/runtime-manager.js";

const manager = new RuntimeManager();
const runtime = manager.initialize();
const MAX_SCREENSHOT_TILES = 10;
const MAX_EMBEDDED_ASSETS = 24;
const MAX_EMBEDDED_ASSET_BYTES = 1_500_000;
const MAX_TOTAL_EMBEDDED_ASSET_BYTES = 6_000_000;

chrome.runtime.onInstalled.addListener(() => {
  manager.initialize();
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error: unknown) => {
      sendResponse(failedMetadataResponse(error instanceof Error ? error.message : "Extension message handler failed."));
    });
  return true;
});

async function handleMessage(message: unknown): Promise<ExtensionResponse> {
  if (!isExtensionRequest(message)) {
    return failedMetadataResponse("Invalid extension message.");
  }

  switch (message.type) {
    case "PING":
      return { type: "PING", payload: { ok: true, version: extensionConfig.version } };
    case "GET_EXTENSION_INFO": {
      const manifest = chrome.runtime.getManifest();
      return { type: "GET_EXTENSION_INFO", payload: { version: manifest.version || extensionConfig.version, manifestVersion: 3, name: "AIO Browser Capture" } };
    }
    case "GET_RUNTIME_STATUS":
      return { type: "GET_RUNTIME_STATUS", payload: runtime.status() };
    case "GET_PAGE_METADATA":
      return { type: "GET_PAGE_METADATA", payload: await getPageMetadata(message.payload.tabId) };
    case "START_CAPTURE": {
      const metadataResult = await getPageMetadata(message.payload.tabId);
      if (!metadataResult.ok) return { type: "START_CAPTURE", payload: { ok: false, status: "FAILED", error: metadataResult.error } };
      const tabId = await resolveTabId(message.payload.tabId);
      if (tabId === undefined) {
        return { type: "START_CAPTURE", payload: { ok: false, status: "FAILED", error: createMessageError("CAPTURE_VALIDATION_FAILED", "No active tab is available.", true) } };
      }
      const begun = runtime.beginCapture(tabId);
      if (!begun.ok) return { type: "START_CAPTURE", payload: { ok: false, status: "FAILED", error: begun.error } };
      const captureResult = await requestBrowserCapture(tabId, begun.session.sessionId, message.payload.options);
      const captureWithAssets = await attachResolvedAssetDataUrls(captureResult);
      const captureWithScreenshot = await attachViewportScreenshot(tabId, captureWithAssets, metadataResult.metadata);
      const completedSession = runtime.completeCapture(begun.session.sessionId, captureWithScreenshot) ?? begun.session;
      if (captureWithScreenshot.status === "FAILED") {
        return { type: "START_CAPTURE", payload: { ok: false, status: "FAILED", session: completedSession, error: captureWithScreenshot.error ?? createMessageError("CAPTURE_FAILED", "Browser capture failed.", true) } };
      }
      const summary: BrowserCaptureSummary = summarizeBrowserCaptureResult(begun.session.sessionId, captureWithScreenshot);
      return {
        type: "START_CAPTURE",
        payload: {
          ok: true,
          status: captureWithScreenshot.status,
          session: completedSession,
          metadata: metadataResult.metadata,
          capture: captureWithScreenshot,
          summary,
          ...(captureWithScreenshot.snapshot ? { snapshotMetadata: captureWithScreenshot.snapshot.metadata, snapshot: captureWithScreenshot.snapshot } : {})
        }
      };
    }
    case "RUN_BROWSER_CAPTURE":
      return failedMetadataResponse("Background does not run browser capture directly.");
    case "SCROLL_TO_CAPTURE_POSITION":
      return failedMetadataResponse("Background does not scroll pages directly.");
    case "CANCEL_CAPTURE": {
      const tabId = await resolveTabId();
      if (tabId !== undefined) {
        try {
          await chrome.tabs.sendMessage(tabId, { type: "CANCEL_CAPTURE", payload: { sessionId: message.payload.sessionId } } satisfies ExtensionRequest);
        } catch {
          // Content script may not be connected; runtime state still needs to recover.
        }
      }
      return {
        type: "CANCEL_CAPTURE",
        payload: { ok: true, sessionId: message.payload.sessionId, cancelled: runtime.cancelCapture(message.payload.sessionId) }
      };
    }
  }
}

async function resolveTabId(tabId?: number): Promise<number | undefined> {
  if (tabId !== undefined) return tabId;
  const tab = await getCurrentTab(chrome);
  return tab?.tabId;
}

async function getPageMetadata(tabId?: number): Promise<{ ok: true; metadata: BrowserPageMetadata } | { ok: false; error: { code: string; message: string; retryable: boolean } }> {
  const resolvedTabId = await resolveTabId(tabId);
  if (resolvedTabId === undefined) {
    return { ok: false, error: createMessageError("CAPTURE_VALIDATION_FAILED", "No active tab is available.", true) };
  }
  try {
    return await requestMetadata(resolvedTabId);
  } catch {
    await injectContentScript(resolvedTabId);
    return requestMetadata(resolvedTabId);
  }
}

async function requestMetadata(tabId: number): Promise<{ ok: true; metadata: BrowserPageMetadata } | { ok: false; error: { code: string; message: string; retryable: boolean } }> {
  const response = (await chrome.tabs.sendMessage(tabId, {
    type: "GET_PAGE_METADATA",
    payload: {}
  } satisfies ExtensionRequest)) as ExtensionResponse;
  if (response.type !== "GET_PAGE_METADATA") {
    return { ok: false, error: createMessageError("INVALID_MESSAGE", "Content script returned an unexpected response.", true) };
  }
  return response.payload;
}

async function requestBrowserCapture(tabId: number, sessionId: string, options?: Partial<BrowserCaptureOptions>): Promise<BrowserCaptureResult> {
  await ensureContentScript(tabId);
  const payload = options ? { sessionId, tabId, options } : { sessionId, tabId };
  const response = (await chrome.tabs.sendMessage(tabId, {
    type: "RUN_BROWSER_CAPTURE",
    payload
  } satisfies ExtensionRequest)) as ExtensionResponse;
  if (response.type !== "RUN_BROWSER_CAPTURE") {
    return {
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
      error: browserCaptureError("CONTENT_SCRIPT_NOT_CONNECTED", "Content script returned an unexpected capture response.", true)
    };
  }
  return response.payload;
}

async function attachResolvedAssetDataUrls(captureResult: BrowserCaptureResult): Promise<BrowserCaptureResult> {
  if (!captureResult.snapshot || captureResult.status === "FAILED") return captureResult;
  const assets = captureResult.snapshot.assets as { references?: Array<{ url?: string; dataUrl?: string; mediaType?: string; unsupported?: boolean; reason?: string }> } | undefined;
  const references = assets?.references;
  if (!Array.isArray(references) || references.length === 0) return captureResult;

  let resolvedCount = 0;
  let totalBytes = 0;
  for (const reference of references) {
    if (resolvedCount >= MAX_EMBEDDED_ASSETS || totalBytes >= MAX_TOTAL_EMBEDDED_ASSET_BYTES) break;
    if (reference.dataUrl || reference.unsupported || !reference.url) continue;
    const resolved = await resolveAssetDataUrl(reference.url, MAX_EMBEDDED_ASSET_BYTES);
    if (!resolved) continue;
    reference.dataUrl = resolved.dataUrl;
    reference.mediaType = resolved.mediaType;
    resolvedCount += 1;
    totalBytes += resolved.byteLength;
  }
  if (resolvedCount === 0) return captureResult;
  return {
    ...captureResult,
    snapshot: {
      ...captureResult.snapshot,
      assets: { ...assets, references }
    }
  };
}

async function resolveAssetDataUrl(url: string, maxBytes: number): Promise<{ dataUrl: string; mediaType: string; byteLength: number } | undefined> {
  if (url.startsWith("data:image/")) {
    const metadataEnd = url.indexOf(";") > 0 ? url.indexOf(";") : url.indexOf(",");
    return { dataUrl: url, mediaType: url.slice(5, metadataEnd > 5 ? metadataEnd : undefined), byteLength: Math.ceil(url.length * 0.75) };
  }
  if (!/^https?:\/\//i.test(url)) return undefined;
  try {
    const response = await fetch(url, { method: "GET", credentials: "omit", cache: "force-cache" });
    if (!response.ok) return undefined;
    const mediaType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!mediaType.startsWith("image/")) return undefined;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength <= 0 || buffer.byteLength > maxBytes) return undefined;
    return { dataUrl: `data:${mediaType};base64,${arrayBufferToBase64(buffer)}`, mediaType, byteLength: buffer.byteLength };
  } catch {
    return undefined;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function attachViewportScreenshot(tabId: number, captureResult: BrowserCaptureResult, metadata: BrowserPageMetadata): Promise<BrowserCaptureResult> {
  if (!captureResult.snapshot || captureResult.status === "FAILED") return captureResult;
  try {
    const tab = await chrome.tabs.get(tabId);
    const captures = [];
    const positions = screenshotTilePositions(metadata);
    for (const y of positions) {
      const scrolled = await scrollTabToCapturePosition(tabId, metadata.scrollX, y, y > 0);
      const current = scrolled.ok ? scrolled.metadata : { ...metadata, scrollY: y };
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
      captures.push({
        type: "VIEWPORT",
        mediaType: "image/png",
        dataUrl,
        x: current.scrollX,
        y: current.scrollY,
        width: current.viewportWidth,
        height: current.viewportHeight,
        deviceScaleFactor: current.devicePixelRatio,
        capturedAt: new Date().toISOString()
      });
    }
    await scrollTabToCapturePosition(tabId, metadata.scrollX, metadata.scrollY, false, true);
    const limited = metadata.documentHeight > metadata.viewportHeight && positions.at(-1)! + metadata.viewportHeight < metadata.documentHeight - 1;
    return {
      ...captureResult,
      snapshot: {
        ...captureResult.snapshot,
        screenshots: { captures },
        warnings: limited
          ? [
              ...captureResult.snapshot.warnings,
              { code: "SCREENSHOT_TILE_LIMIT_REACHED", message: `Full-page screenshot capture was limited to ${MAX_SCREENSHOT_TILES} viewport tiles.`, severity: "WARNING", source: "CAPTURE" }
            ]
          : captureResult.snapshot.warnings,
        metrics: limited
          ? { ...captureResult.snapshot.metrics, warningCount: captureResult.snapshot.metrics.warningCount + 1 }
          : captureResult.snapshot.metrics
      }
    };
  } catch {
    return {
      ...captureResult,
      warnings: [
        ...captureResult.warnings,
        { code: "CAPTURE_PARTIAL", message: "Viewport screenshot capture failed; DOM snapshot is still available.", severity: "WARNING" }
      ],
      snapshot: {
        ...captureResult.snapshot,
        warnings: [
          ...captureResult.snapshot.warnings,
          { code: "VIEWPORT_SCREENSHOT_FAILED", message: "Viewport screenshot capture failed; DOM snapshot is still available.", severity: "WARNING", source: "CAPTURE" }
        ],
        metrics: {
          ...captureResult.snapshot.metrics,
          warningCount: captureResult.snapshot.metrics.warningCount + 1
        }
      }
    };
  }
}

function screenshotTilePositions(metadata: BrowserPageMetadata): number[] {
  const viewportHeight = Math.max(1, metadata.viewportHeight);
  const documentHeight = Math.max(viewportHeight, metadata.documentHeight);
  const maxScrollY = Math.max(0, documentHeight - viewportHeight);
  const step = viewportHeight;
  const positions = new Set<number>([0]);
  for (let y = step; y < maxScrollY && positions.size < MAX_SCREENSHOT_TILES; y += step) positions.add(Math.min(maxScrollY, y));
  if (positions.size < MAX_SCREENSHOT_TILES) positions.add(maxScrollY);
  return [...positions].sort((a, b) => a - b);
}

async function scrollTabToCapturePosition(tabId: number, x: number, y: number, hideFixed = false, restoreFixed = false): Promise<{ ok: true; metadata: BrowserPageMetadata } | { ok: false }> {
  try {
    const response = (await chrome.tabs.sendMessage(tabId, {
      type: "SCROLL_TO_CAPTURE_POSITION",
      payload: { x, y, hideFixed, restoreFixed }
    } satisfies ExtensionRequest)) as ExtensionResponse;
    return response.type === "SCROLL_TO_CAPTURE_POSITION" && response.payload.ok ? { ok: true, metadata: response.payload.metadata } : { ok: false };
  } catch {
    return { ok: false };
  }
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await requestMetadata(tabId);
  } catch {
    await injectContentScript(tabId);
  }
}

async function injectContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({ target: { tabId }, files: [getContentScriptFile()] });
}

function getContentScriptFile(): string {
  const manifest = chrome.runtime.getManifest() as { content_scripts?: Array<{ js?: string[] }> };
  const [script] = manifest.content_scripts ?? [];
  const [file] = script?.js ?? [];
  return file ?? "src/content/content-script.js";
}

function failedMetadataResponse(message: string): ExtensionResponse {
  return {
    type: "GET_PAGE_METADATA",
    payload: { ok: false, error: createMessageError("HANDLER_EXECUTION_FAILED", message, true) }
  };
}

export function getBackgroundRuntimeStatus() {
  return runtime.status();
}

export async function getBackgroundDiagnostics() {
  return collectDiagnostics(chrome, runtime);
}
