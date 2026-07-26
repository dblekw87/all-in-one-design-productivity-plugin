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
const captureSummary = requireElement("capture-summary");
const message = requireElement("message");
const captureButton = requireButton("capture-button");
const diagnosticsButton = requireButton("diagnostics-button");
const settingsButton = requireButton("settings-button");

void initialize();

captureButton.addEventListener("click", async () => {
  message.textContent = "Preparing browser capture...";
  captureButton.disabled = true;
  const response = await sendMessage({ type: "START_CAPTURE", payload: {} });
  captureButton.disabled = false;
  if (response.type === "START_CAPTURE" && response.payload.ok) {
    renderMetadata(response.payload.metadata);
    renderCaptureSummary(response.payload.summary, response.payload.capture.progress.at(-1)?.currentStage ?? "COMPLETED");
    message.textContent = `Capture ${response.payload.status}: ${response.payload.session.sessionId}`;
    return;
  }
  message.textContent = response.type === "START_CAPTURE" && !response.payload.ok ? response.payload.error.message : "Capture runtime is not ready for this tab.";
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

function renderCaptureSummary(summary: { status: string; snapshotVersion?: string; nodeCount: number; warningCount: number; durationMs: number; truncated: boolean }, stage: string): void {
  captureSummary.hidden = false;
  captureSummary.textContent = [
    `Stage ${stage}`,
    `Status ${summary.status}`,
    `Nodes ${summary.nodeCount}`,
    `Warnings ${summary.warningCount}`,
    `Duration ${summary.durationMs}ms`,
    `Snapshot ${summary.snapshotVersion || "none"}`,
    `Truncated ${summary.truncated ? "yes" : "no"}`
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
