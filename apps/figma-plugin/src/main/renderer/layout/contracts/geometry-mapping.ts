import type { DesignIrDocumentNode, DesignIrNode } from "@aio/design-ir";

export interface RootScaleValidation {
  width: number;
  height: number;
  warningCodes: string[];
}

export function validateRootScale(node: DesignIrDocumentNode): RootScaleValidation {
  const width = finitePositive(node.documentSize.width) ? node.documentSize.width : node.geometry.width;
  const height = finitePositive(node.documentSize.height) ? node.documentSize.height : node.geometry.height;
  const warnings: string[] = [];
  if (!finitePositive(width)) warnings.push("ROOT_WIDTH_INVALID");
  if (!finitePositive(height)) warnings.push("ROOT_HEIGHT_INVALID");
  if (finitePositive(node.viewport.width) && finitePositive(width) && Math.abs(width - node.viewport.width) / node.viewport.width > 0.1) warnings.push("ROOT_SCALE_MISMATCH");
  return { width: finitePositive(width) ? width : 1, height: finitePositive(height) ? height : 1, warningCodes: warnings };
}

export function toParentRelativeBounds(node: DesignIrNode, parent: DesignIrNode | undefined): { x: number; y: number; width: number; height: number } {
  if (node.geometry.coordinateSpace === "PARENT" || !parent) return { ...node.geometry };
  return { x: node.geometry.x - parent.geometry.x, y: node.geometry.y - parent.geometry.y, width: node.geometry.width, height: node.geometry.height };
}

export function geometryIsValid(node: DesignIrNode): boolean {
  return [node.geometry.x, node.geometry.y, node.geometry.width, node.geometry.height].every(Number.isFinite) && node.geometry.width >= 0 && node.geometry.height >= 0;
}

function finitePositive(value: number): boolean { return Number.isFinite(value) && value > 0; }
