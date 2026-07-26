import type { CaptureSnapshot, CaptureSnapshotSummary } from "@aio/shared-contracts";

export function summarizeCaptureSnapshot(snapshot: CaptureSnapshot): CaptureSnapshotSummary {
  return {
    version: snapshot.version,
    captureMode: snapshot.capture.mode,
    ...(snapshot.capture.providerId ? { captureProvider: snapshot.capture.providerId } : {}),
    ...(snapshot.document.finalUrl ? { finalUrl: snapshot.document.finalUrl } : {}),
    ...(snapshot.document.title ? { title: snapshot.document.title } : {}),
    domCount: snapshot.metrics.domCount,
    styleCount: snapshot.metrics.styleCount,
    geometryCount: snapshot.metrics.geometryCount,
    assetCount: snapshot.metrics.assetCount,
    warningCount: snapshot.metrics.warningCount,
    durationMs: snapshot.metrics.durationMs
  };
}
