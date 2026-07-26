import type { BrowserPageMetadata, ExtensionRequest, ExtensionResponse } from "../contracts/messages.js";
import "../shared/chrome-types.js";

const extensionVersion = requireElement("extension-version");
const connectionStatus = requireElement("connection-status");
const runtimeStatus = requireElement("runtime-status");
const captureMode = requireElement("capture-mode");
const currentTab = requireElement("current-tab");
const currentTitle = requireElement("current-title");
const currentUrl = requireElement("current-url");
const metadata = requireElement("metadata");
const message = requireElement("message");
const captureButton = requireButton("capture-button");
const diagnosticsButton = requireButton("diagnostics-button");
const settingsButton = requireButton("settings-button");

void initialize();

captureButton.addEventListener("click", async () => {
  message.textContent = "Requesting capture metadata...";
  const response = await sendMessage({ type: "START_CAPTURE", payload: {} });
  if (response.type === "START_CAPTURE" && response.payload.ok) {
    renderMetadata(response.payload.metadata);
    message.textContent = `Snapshot metadata ready: ${response.payload.session.sessionId}`;
    return;
  }
  message.textContent = "Capture runtime is not ready for this tab.";
});

diagnosticsButton.addEventListener("click", async () => {
  const response = await sendMessage({ type: "GET_RUNTIME_STATUS", payload: {} });
  if (response.type === "GET_RUNTIME_STATUS") {
    message.textContent = `Runtime ${response.payload.state}, sessions ${response.payload.activeSessionCount}`;
  }
});

settingsButton.addEventListener("click", () => {
  message.textContent = "Settings are reserved for a future step.";
});

async function initialize(): Promise<void> {
  const [info, status, page] = await Promise.all([
    sendMessage({ type: "GET_EXTENSION_INFO", payload: {} }),
    sendMessage({ type: "GET_RUNTIME_STATUS", payload: {} }),
    sendMessage({ type: "GET_PAGE_METADATA", payload: {} })
  ]);
  if (info.type === "GET_EXTENSION_INFO") extensionVersion.textContent = info.payload.version;
  if (status.type === "GET_RUNTIME_STATUS") {
    connectionStatus.textContent = status.payload.ready ? "Connected" : "Disconnected";
    runtimeStatus.textContent = status.payload.state;
    captureMode.textContent = status.payload.currentMode;
  }
  if (page.type === "GET_PAGE_METADATA" && page.payload.ok) {
    currentTab.textContent = page.payload.metadata.url;
    currentTitle.textContent = page.payload.metadata.title || "Untitled";
    currentUrl.textContent = page.payload.metadata.url;
    renderMetadata(page.payload.metadata);
  } else {
    currentTab.textContent = "Unavailable";
    currentTitle.textContent = "Unavailable";
    currentUrl.textContent = "Content script disconnected";
  }
}

async function sendMessage(request: ExtensionRequest): Promise<ExtensionResponse> {
  return (await chrome.runtime.sendMessage(request)) as ExtensionResponse;
}

function renderMetadata(data: BrowserPageMetadata): void {
  metadata.hidden = false;
  metadata.textContent = [
    `Viewport ${data.viewportWidth}x${data.viewportHeight}`,
    `Document ${data.documentWidth}x${data.documentHeight}`,
    `Scroll ${data.scrollX},${data.scrollY}`,
    `DPR ${data.devicePixelRatio}`,
    `Language ${data.language}`,
    `Theme ${data.theme}`
  ].join(" | ");
}

function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing popup element: ${id}`);
  return element;
}

function requireButton(id: string): HTMLButtonElement {
  const element = requireElement(id);
  if (!(element instanceof HTMLButtonElement)) throw new Error(`Expected popup button: ${id}`);
  return element;
}
