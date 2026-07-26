import type { BrowserPageMetadata } from "../../contracts/messages.js";
import type { BrowserCaptureProgress } from "../contracts/browser-capture-progress.js";
import type { BrowserCaptureRequest } from "../contracts/browser-capture-request.js";
import type { BrowserCaptureWarning } from "../contracts/browser-capture-errors.js";
import { BROWSER_CAPTURE_LIMITS } from "./capture-limits.js";

export interface BrowserCaptureContext {
  request: BrowserCaptureRequest;
  metadata: BrowserPageMetadata;
  startedAt: number;
  warnings: BrowserCaptureWarning[];
  progress: BrowserCaptureProgress[];
  completedNodes: number;
  totalTextLength: number;
  skippedNodeCount: number;
  hiddenCount: number;
  truncated: boolean;
  isCancelled(): boolean;
  addProgress(stage: BrowserCaptureProgress["currentStage"]): void;
  addWarning(warning: BrowserCaptureWarning): void;
  shouldStop(): boolean;
}

export function createCaptureContext(request: BrowserCaptureRequest, metadata: BrowserPageMetadata, isCancelled: () => boolean, now = Date.now()): BrowserCaptureContext {
  const context: BrowserCaptureContext = {
    request,
    metadata,
    startedAt: now,
    warnings: [],
    progress: [],
    completedNodes: 0,
    totalTextLength: 0,
    skippedNodeCount: 0,
    hiddenCount: 0,
    truncated: false,
    isCancelled,
    addProgress(stage) {
      context.progress.push({
        currentStage: stage,
        completedNodes: context.completedNodes,
        totalEstimate: request.options.maxNodes,
        warningCount: context.warnings.length
      });
    },
    addWarning(warning) {
      context.warnings.push(warning);
    },
    shouldStop() {
      if (isCancelled()) return true;
      if (Date.now() - context.startedAt > BROWSER_CAPTURE_LIMITS.maxCaptureDurationMs) {
        context.truncated = true;
        context.addWarning({ code: "CAPTURE_DURATION_LIMIT_EXCEEDED", message: "Capture duration limit was reached.", severity: "WARNING" });
        return true;
      }
      return false;
    }
  };
  return context;
}

export async function cooperativeYield(count: number): Promise<void> {
  if (count % BROWSER_CAPTURE_LIMITS.yieldEveryNodeCount !== 0) return;
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}
