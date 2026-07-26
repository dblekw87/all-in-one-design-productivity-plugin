import type { ExtensionCaptureSession, ExtensionCaptureSessionStatus } from "../contracts/messages.js";

export class CaptureSessionStore {
  private readonly sessions = new Map<string, ExtensionCaptureSession>();

  create(tabId: number, now = new Date()): ExtensionCaptureSession {
    const session: ExtensionCaptureSession = {
      sessionId: `cap_${crypto.randomUUID()}`,
      tabId,
      captureMode: "BROWSER_TAB",
      status: "CREATED",
      createdAt: now.toISOString()
    };
    this.sessions.set(session.sessionId, session);
    return session;
  }

  transition(sessionId: string, status: ExtensionCaptureSessionStatus, now = new Date()): ExtensionCaptureSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    const next: ExtensionCaptureSession = {
      ...session,
      status,
      ...(status === "STARTED" ? { startedAt: now.toISOString() } : {}),
      ...(status === "METADATA_READY" || status === "COMPLETED" || status === "PARTIAL" || status === "CANCELLED" || status === "FAILED" ? { endedAt: now.toISOString() } : {})
    };
    this.sessions.set(sessionId, next);
    return next;
  }

  count(): number {
    return this.sessions.size;
  }

  get(sessionId: string): ExtensionCaptureSession | undefined {
    return this.sessions.get(sessionId);
  }

  active(): ExtensionCaptureSession | undefined {
    return Array.from(this.sessions.values()).find((session) => session.status === "STARTED" || session.status === "CAPTURING");
  }
}
