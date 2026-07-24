export type RenderStatus = "COMPLETED" | "CANCELLED" | "ROLLED_BACK" | "PARTIAL" | "FAILED";

export interface RenderWarning {
  code: string;
  message: string;
  irNodeId?: string;
}

export interface RenderDesignIrResult {
  status: RenderStatus;
  rootFigmaNodeId?: string;
  mappings: Array<{ irNodeId: string; figmaNodeId: string }>;
  metrics: {
    requestedNodeCount: number;
    createdNodeCount: number;
    skippedNodeCount: number;
    placeholderNodeCount: number;
    rollbackNodeCount: number;
    durationMs: number;
  };
  warnings: RenderWarning[];
  failures: Array<{ code: string; message: string; irNodeId?: string }>;
}
