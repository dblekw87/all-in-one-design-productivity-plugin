import type { CapabilityFailure, CapabilityWarning } from "./error.js";

export interface CapabilityResult {
  capabilityId: string;
  operationId: string;
  success: boolean;
  processedCount: number;
  createdCount: number;
  changedCount: number;
  skippedCount: number;
  failedCount: number;
  warnings: CapabilityWarning[];
  failures: CapabilityFailure[];
  startedAt: string;
  completedAt: string;
}

export function createNotImplementedResult(capabilityId: string, operationId: string): CapabilityResult {
  const timestamp = new Date().toISOString();

  return {
    capabilityId,
    operationId,
    success: false,
    processedCount: 0,
    createdCount: 0,
    changedCount: 0,
    skippedCount: 0,
    failedCount: 1,
    warnings: [],
    failures: [
      {
        code: "NOT_IMPLEMENTED",
        message: "Capability execution is not implemented in this scaffold."
      }
    ],
    startedAt: timestamp,
    completedAt: timestamp
  };
}
