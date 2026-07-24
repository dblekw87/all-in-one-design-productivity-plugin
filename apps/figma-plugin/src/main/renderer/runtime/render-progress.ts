export interface RenderProgress {
  stage: "VALIDATING_IR" | "CREATING_ROOT" | "CREATING_NODES" | "APPLYING_HIERARCHY" | "COMMITTING" | "ROLLING_BACK" | "COMPLETED" | "INDEXING_ASSETS" | "DOWNLOADING_ASSETS" | "CREATING_IMAGES" | "APPLYING_IMAGE_PAINTS" | "CLEANING_TRANSFER_SESSION";
  completedNodes: number;
  totalNodes: number;
  currentIrNodeId?: string;
  message: string;
}
