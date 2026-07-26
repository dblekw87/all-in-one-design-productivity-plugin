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
      const completedSession = runtime.completeCapture(begun.session.sessionId, captureResult) ?? begun.session;
      if (captureResult.status === "FAILED") {
        return { type: "START_CAPTURE", payload: { ok: false, status: "FAILED", session: completedSession, error: captureResult.error ?? createMessageError("CAPTURE_FAILED", "Browser capture failed.", true) } };
      }
      const summary: BrowserCaptureSummary = summarizeBrowserCaptureResult(begun.session.sessionId, captureResult);
      return {
        type: "START_CAPTURE",
        payload: {
          ok: true,
          status: captureResult.status,
          session: completedSession,
          metadata: metadataResult.metadata,
          capture: captureResult,
          summary,
          ...(captureResult.snapshot ? { snapshotMetadata: captureResult.snapshot.metadata, snapshot: captureResult.snapshot } : {})
        }
      };
    }
    case "RUN_BROWSER_CAPTURE":
      return failedMetadataResponse("Background does not run browser capture directly.");
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
    await chrome.scripting.executeScript({ target: { tabId: resolvedTabId }, files: ["src/content/content-script.js"] });
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

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await requestMetadata(tabId);
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["src/content/content-script.js"] });
  }
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
