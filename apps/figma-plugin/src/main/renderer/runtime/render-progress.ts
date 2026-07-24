export interface RenderProgress {
  stage: "VALIDATING_IR" | "CREATING_ROOT" | "CREATING_NODES" | "APPLYING_HIERARCHY" | "COMMITTING" | "ROLLING_BACK" | "COMPLETED";
  completedNodes: number;
  totalNodes: number;
  currentIrNodeId?: string;
  message: string;
}
