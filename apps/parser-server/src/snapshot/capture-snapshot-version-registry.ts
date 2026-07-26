import type { CaptureSnapshotVersion } from "@aio/shared-contracts";

export class CaptureSnapshotVersionRegistry {
  private readonly versions = new Set<CaptureSnapshotVersion>(["1.0"]);

  supports(version: string): version is CaptureSnapshotVersion {
    return this.versions.has(version as CaptureSnapshotVersion);
  }

  list(): CaptureSnapshotVersion[] {
    return [...this.versions];
  }
}

export const captureSnapshotVersionRegistry = new CaptureSnapshotVersionRegistry();
