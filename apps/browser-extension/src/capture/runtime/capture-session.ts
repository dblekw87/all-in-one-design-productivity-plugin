export type BrowserCaptureRuntimeSessionStatus = "CREATED" | "CAPTURING" | "COMPLETED" | "PARTIAL" | "CANCELLED" | "FAILED";

export interface BrowserCaptureRuntimeSession {
  sessionId: string;
  tabId: number;
  status: BrowserCaptureRuntimeSessionStatus;
  createdAt: string;
  updatedAt: string;
}
