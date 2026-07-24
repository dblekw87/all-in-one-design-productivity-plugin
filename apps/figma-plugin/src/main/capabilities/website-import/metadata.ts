import type { CapabilityMetadata } from "@aio/shared-contracts";

export const websiteImportMetadata: CapabilityMetadata = {
  id: "website-import",
  category: "IMPORT",
  label: "Website Import",
  description: "Import a public website into editable Figma layers.",
  order: 10,
  enabled: true,
  supportsPreview: false,
  supportsCancel: true,
  supportsRestore: false
};
