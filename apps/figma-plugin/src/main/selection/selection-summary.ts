import type { SelectionNodeSummary, SelectionSummary } from "@aio/shared-contracts";

export interface SummarizableNode {
  id: string;
  name: string;
  type: string;
}

export interface SelectionSummaryProvider {
  getSelectionSummary(): SelectionSummary;
}

export function createSelectionSummary(
  selection: readonly SummarizableNode[],
  pageId: string,
  version: number
): SelectionSummary {
  const nodeTypes = [...new Set(selection.map((node) => node.type))].sort();
  const nodes: SelectionNodeSummary[] = selection.map((node) => ({
    id: node.id,
    name: node.name,
    type: node.type
  }));

  return {
    selectionCount: selection.length,
    nodeTypes,
    textNodeCount: countByType(selection, "TEXT"),
    frameNodeCount: countByType(selection, "FRAME"),
    componentNodeCount: countByType(selection, "COMPONENT"),
    instanceNodeCount: countByType(selection, "INSTANCE"),
    pageId,
    version,
    nodes
  };
}

export function createSelectionSignature(selection: readonly SummarizableNode[], pageId: string): string {
  return `${pageId}:${selection.map((node) => `${node.id}:${node.type}`).join("|")}`;
}

function countByType(selection: readonly SummarizableNode[], type: string): number {
  return selection.filter((node) => node.type === type).length;
}
