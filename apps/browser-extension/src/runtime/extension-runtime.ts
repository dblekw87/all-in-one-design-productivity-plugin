import { extensionConfig } from "../shared/config.js";
import type { BrowserCaptureResult } from "../capture/index.js";
import type { BrowserPageMetadata, ExtensionCaptureSession, ExtensionRuntimeState, ExtensionRuntimeStatus, StartCaptureResponse } from "../contracts/messages.js";
import { BrowserExtensionCaptureProvider } from "./browser-extension-capture-provider.js";
import { CaptureSessionStore } from "./capture-session.js";

export class ExtensionRuntime {
  private state: ExtensionRuntimeState = "INITIALIZING";

  constructor(
    private readonly sessions = new CaptureSessionStore(),
    private readonly provider = new BrowserExtensionCaptureProvider()
  ) {}

  initialize(): void {
    this.state = "READY";
  }

  status(): ExtensionRuntimeStatus {
    return {
      state: this.state,
      version: extensionConfig.version,
      ready: this.state === "READY" || this.state === "BUSY",
      currentMode: extensionConfig.captureMode,
      activeSessionCount: this.sessions.count()
    };
  }

  startCapture(tabId: number, metadata: BrowserPageMetadata, now = new Date()): StartCaptureResponse {
    this.state = "CAPTURING";
    const session = this.sessions.create(tabId, now);
    this.sessions.transition(session.sessionId, "STARTED", now);
    const response = this.provider.capture({ session: { ...session, status: "STARTED", startedAt: now.toISOString() }, metadata, now });
    if (response.ok) {
      this.sessions.transition(session.sessionId, "METADATA_READY", now);
      this.state = "READY";
      return response;
    }
    this.sessions.transition(session.sessionId, "FAILED", now);
    this.state = "ERROR";
    return response;
  }

  beginCapture(tabId: number, now = new Date()): { ok: true; session: ExtensionCaptureSession } | { ok: false; error: { code: string; message: string; retryable: boolean } } {
    if (this.sessions.active()) {
      return { ok: false, error: { code: "CAPTURE_ALREADY_RUNNING", message: "A browser capture is already running.", retryable: true } };
    }
    this.state = "CAPTURING";
    const session = this.sessions.create(tabId, now);
    const started = this.sessions.transition(session.sessionId, "CAPTURING", now) ?? session;
    return { ok: true, session: started };
  }

  completeCapture(sessionId: string, result: BrowserCaptureResult, now = new Date()): ExtensionCaptureSession | undefined {
    const status = result.status === "COMPLETED" ? "COMPLETED" : result.status === "PARTIAL" ? "PARTIAL" : result.status === "CANCELLED" ? "CANCELLED" : "FAILED";
    const session = this.sessions.transition(sessionId, status, now);
    this.state = status === "FAILED" ? "ERROR" : "READY";
    return session;
  }

  cancelCapture(sessionId: string): boolean {
    const cancelled = this.sessions.transition(sessionId, "CANCELLED");
    this.state = "READY";
    return Boolean(cancelled);
  }
}
