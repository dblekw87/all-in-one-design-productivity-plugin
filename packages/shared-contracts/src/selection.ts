export interface SelectionNodeSummary {
  id: string;
  name: string;
  type: string;
}

export interface SelectionSummary {
  selectionCount: number;
  nodeTypes: string[];
  textNodeCount: number;
  frameNodeCount: number;
  componentNodeCount: number;
  instanceNodeCount: number;
  pageId: string;
  version: number;
  nodes: SelectionNodeSummary[];
}

export function createEmptySelectionSummary(pageId: string, version: number): SelectionSummary {
  return {
    selectionCount: 0,
    nodeTypes: [],
    textNodeCount: 0,
    frameNodeCount: 0,
    componentNodeCount: 0,
    instanceNodeCount: 0,
    pageId,
    version,
    nodes: []
  };
}
