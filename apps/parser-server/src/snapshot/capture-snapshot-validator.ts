import { captureSnapshotSchema, type CaptureSnapshot } from "@aio/shared-contracts";
import { captureSnapshotVersionRegistry } from "./capture-snapshot-version-registry.js";

export type CaptureSnapshotValidationResult =
  | { ok: true; snapshot: CaptureSnapshot }
  | { ok: false; issues: Array<{ path: string; message: string }> };

export function validateCaptureSnapshot(value: unknown): CaptureSnapshotValidationResult {
  const parsed = captureSnapshotSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    };
  }

  const snapshot = parsed.data as CaptureSnapshot;
  const semanticIssues = validateCaptureSnapshotSemantics(snapshot);
  return semanticIssues.length > 0 ? { ok: false, issues: semanticIssues } : { ok: true, snapshot };
}

export function validateCaptureSnapshotSemantics(snapshot: CaptureSnapshot): Array<{ path: string; message: string }> {
  const issues: Array<{ path: string; message: string }> = [];
  if (!captureSnapshotVersionRegistry.supports(snapshot.version)) {
    issues.push({ path: "version", message: `Unsupported capture snapshot version: ${snapshot.version}` });
  }
  if (snapshot.capture.mode !== snapshot.capture.source.mode) {
    issues.push({ path: "capture.source.mode", message: "Capture source mode must match capture mode." });
  }
  if (snapshot.metadata.captureMode !== snapshot.capture.mode) {
    issues.push({ path: "metadata.captureMode", message: "Snapshot metadata captureMode must match capture mode." });
  }
  if (snapshot.metadata.devicePixelRatio !== snapshot.viewport.deviceScaleFactor) {
    issues.push({ path: "metadata.devicePixelRatio", message: "Snapshot devicePixelRatio must match viewport deviceScaleFactor." });
  }
  if (snapshot.metrics.warningCount !== snapshot.warnings.length) {
    issues.push({ path: "metrics.warningCount", message: "Snapshot warningCount must match warnings length." });
  }
  const pseudoCount = snapshot.pseudo.beforeCount + snapshot.pseudo.afterCount;
  if (snapshot.metrics.pseudoCount !== pseudoCount) {
    issues.push({ path: "metrics.pseudoCount", message: "Snapshot pseudoCount must equal beforeCount plus afterCount." });
  }
  if (snapshot.metrics.svgCount !== snapshot.svg.count) {
    issues.push({ path: "metrics.svgCount", message: "Snapshot svgCount must match svg.count." });
  }
  return issues;
}
