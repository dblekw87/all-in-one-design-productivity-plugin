import type { CapabilityMetadata } from "@aio/shared-contracts";

export const renderDesignIrMetadata: CapabilityMetadata = {
  id: "render-design-ir",
  category: "IMPORT",
  label: "Render Design IR",
  description: "Render a validated Design IR document into Figma placeholder layers.",
  order: 11,
  enabled: true,
  experimental: true,
  supportsPreview: false,
  supportsCancel: true,
  supportsRestore: false
};
