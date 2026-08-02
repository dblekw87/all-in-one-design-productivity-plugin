import type { CapabilityMetadata } from "@aio/shared-contracts";

export const browserSnapshotImportMetadata: CapabilityMetadata = {
  id: "browser-snapshot-import",
  category: "IMPORT",
  label: "Browser Snapshot Import",
  description: "Validates Universal Capture Snapshot JSON from the browser extension before rendering support is added.",
  order: 11,
  enabled: true,
  experimental: true,
  supportsCancel: false
};
