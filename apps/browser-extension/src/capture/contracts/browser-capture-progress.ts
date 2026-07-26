export type BrowserCaptureProgressStage =
  | "PREPARING_CAPTURE"
  | "CAPTURING_DOM"
  | "CAPTURING_STYLES"
  | "CAPTURING_GEOMETRY"
  | "CAPTURING_PSEUDO"
  | "CAPTURING_SVG"
  | "CAPTURING_ASSETS"
  | "VALIDATING_SNAPSHOT"
  | "COMPLETED";

export interface BrowserCaptureProgress {
  currentStage: BrowserCaptureProgressStage;
  completedNodes: number;
  totalEstimate: number;
  warningCount: number;
}
