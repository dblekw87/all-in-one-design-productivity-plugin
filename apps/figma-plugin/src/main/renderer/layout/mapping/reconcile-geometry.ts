import type { DesignIrNode } from "@aio/design-ir";
import type { RendererNode } from "../../runtime/node-types.js";
import { LAYOUT_POLICY } from "../contracts/layout-mapping.js";

export interface GeometryReconciliation {
  diverged: boolean;
  widthDelta: number;
  heightDelta: number;
}

export function reconcileGeometry(target: RendererNode, node: DesignIrNode): GeometryReconciliation {
  const widthDelta = Math.abs(target.width - node.geometry.width);
  const heightDelta = Math.abs(target.height - node.geometry.height);
  return { diverged: widthDelta > LAYOUT_POLICY.geometryTolerance || heightDelta > LAYOUT_POLICY.geometryTolerance, widthDelta, heightDelta };
}
