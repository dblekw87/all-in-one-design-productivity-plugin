export type CapabilityCategory =
  | "IMPORT"
  | "REPLACE"
  | "WRITING"
  | "INSPECT"
  | "GENERATE"
  | "SETTINGS";

export interface CapabilityMetadata {
  id: string;
  category: CapabilityCategory;
  label: string;
  description: string;
  order: number;
  enabled: boolean;
  experimental?: boolean;
  supportsPreview?: boolean;
  supportsCancel?: boolean;
  supportsRestore?: boolean;
}
