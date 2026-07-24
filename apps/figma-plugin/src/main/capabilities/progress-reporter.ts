import {
  PluginMessageType,
  type CapabilityProgress,
  type CapabilityProgressEvent,
  type OperationId
} from "@aio/shared-contracts";
import { createMessageEnvelope } from "../messaging/message-router";
import type { CapabilityProgressUpdate } from "./contracts";

export interface ProgressReporter {
  report(update: CapabilityProgressUpdate): void;
}

export function createProgressReporter(
  operationId: OperationId,
  capabilityId: string,
  postEvent: (event: CapabilityProgressEvent) => void
): ProgressReporter {
  return {
    report(update) {
      const progress: CapabilityProgress = {
        operationId,
        capabilityId,
        phase: update.phase,
        progress: clampProgress(update.progress)
      };
      if (update.message) {
        progress.message = update.message;
      }

      postEvent(createMessageEnvelope(PluginMessageType.CAPABILITY_PROGRESS_EVENT, progress));
    }
  };
}

function clampProgress(progress: number): number {
  return Math.min(1, Math.max(0, progress));
}
