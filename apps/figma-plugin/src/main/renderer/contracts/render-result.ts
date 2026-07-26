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
  layoutMeasurements?: Array<{
    irNodeId: string;
    beforeParentWidth: number;
    beforeParentHeight: number;
    beforeChildTotalContentWidth: number;
    beforeChildTotalContentHeight: number;
    parentWidth: number;
    parentHeight: number;
    childTotalContentWidth: number;
    childTotalContentHeight: number;
    autoLayoutGap: number;
    expectedWidth: number;
    expectedHeight: number;
    widthDivergence: number;
    heightDivergence: number;
    fixedHeightOversize: number;
    children: Array<{ irNodeId: string; irWidth: number; actualWidth: number; widthRatio: number }>;
    correctionCodes: string[];
  }>;
  layoutReconstruction?: {
    rootWidth?: number;
    bodyWidth?: number;
    mainWidth?: number;
    rightRailWidth?: number;
    mainRailRatio?: number;
    sections: Array<{ irNodeId: string; top: number; bottom: number; parentHeight: number; contentHeight: number; childTotalHeight: number; gapTotal: number; divergencePercent: number }>;
    text: Array<{ irNodeId: string; width: number; measuredHeight: number; divergencePercent: number }>;
    corrections: string[];
    centeredControlCount: number;
    textOverflowCount: number;
    textOverlapCount: number;
    gridContainerCount: number;
    gridChildCount: number;
    gridGeometryDivergence: number;
  };
}
