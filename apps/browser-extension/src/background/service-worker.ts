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
      return { type: "START_CAPTURE", payload: runtime.startCapture(tabId, metadataResult.metadata) };
    }
    case "CANCEL_CAPTURE":
      return {
        type: "CANCEL_CAPTURE",
        payload: { ok: true, sessionId: message.payload.sessionId, cancelled: runtime.cancelCapture(message.payload.sessionId) }
      };
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
