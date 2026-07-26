import type { CaptureSnapshot, CaptureSnapshotMetadata } from "@aio/shared-contracts";

export type ExtensionRuntimeState = "INITIALIZING" | "READY" | "BUSY" | "CAPTURING" | "ERROR" | "DISCONNECTED";
export type ExtensionMessageType =
  | "PING"
  | "GET_RUNTIME_STATUS"
  | "GET_PAGE_METADATA"
  | "START_CAPTURE"
  | "CANCEL_CAPTURE"
  | "GET_EXTENSION_INFO";

export interface BrowserPageMetadata {
  url: string;
  title: string;
  viewportWidth: number;
  viewportHeight: number;
  documentWidth: number;
  documentHeight: number;
  scrollX: number;
  scrollY: number;
  devicePixelRatio: number;
  language: string;
  theme: "light" | "dark" | "no-preference";
}

export interface BrowserTabInfo {
  tabId: number;
  url?: string;
  title?: string;
  active: boolean;
}

export type ExtensionCaptureSessionStatus = "CREATED" | "STARTED" | "METADATA_READY" | "CANCELLED" | "FAILED";

export interface ExtensionCaptureSession {
  sessionId: string;
  tabId: number;
  captureMode: "BROWSER_TAB";
  status: ExtensionCaptureSessionStatus;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

export interface ExtensionRuntimeStatus {
  state: ExtensionRuntimeState;
  version: string;
  ready: boolean;
  currentMode: "BROWSER_TAB";
  activeSessionCount: number;
}

export interface ExtensionInfo {
  version: string;
  manifestVersion: 3;
  name: string;
}

export interface ExtensionDiagnostics {
  version: string;
  manifestVersion: 3;
  permissions: {
    activeTab: boolean;
    tabs: boolean;
    storage: boolean;
    scripting: boolean;
  };
  connectedTab?: BrowserTabInfo;
  currentUrl?: string;
  currentMode: "BROWSER_TAB";
  runtimeStatus: ExtensionRuntimeStatus;
  captureSupport: {
    browserTab: boolean;
    dom: boolean;
    style: boolean;
    geometry: boolean;
    screenshot: boolean;
  };
}

export type ExtensionRequest =
  | { type: "PING"; payload: Record<string, never> }
  | { type: "GET_RUNTIME_STATUS"; payload: Record<string, never> }
  | { type: "GET_PAGE_METADATA"; payload: { tabId?: number } }
  | { type: "START_CAPTURE"; payload: { tabId?: number } }
  | { type: "CANCEL_CAPTURE"; payload: { sessionId: string } }
  | { type: "GET_EXTENSION_INFO"; payload: Record<string, never> };

export type StartCaptureResponse =
  | {
      ok: true;
      status: "CAPTURE_METADATA_READY";
      session: ExtensionCaptureSession;
      metadata: BrowserPageMetadata;
      snapshotMetadata: CaptureSnapshotMetadata;
      snapshot: CaptureSnapshot;
    }
  | {
      ok: false;
      status: "FAILED";
      session?: ExtensionCaptureSession;
      error: { code: string; message: string; retryable: boolean };
    };

export type ExtensionResponse =
  | { type: "PING"; payload: { ok: true; version: string } }
  | { type: "GET_RUNTIME_STATUS"; payload: ExtensionRuntimeStatus }
  | { type: "GET_PAGE_METADATA"; payload: { ok: true; metadata: BrowserPageMetadata } | { ok: false; error: { code: string; message: string; retryable: boolean } } }
  | { type: "START_CAPTURE"; payload: StartCaptureResponse }
  | { type: "CANCEL_CAPTURE"; payload: { ok: true; sessionId: string; cancelled: boolean } | { ok: false; error: { code: string; message: string; retryable: boolean } } }
  | { type: "GET_EXTENSION_INFO"; payload: ExtensionInfo };
