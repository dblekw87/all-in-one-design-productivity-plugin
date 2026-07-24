import type { DesignIrImageNode } from "@aio/design-ir";
import type { ImageScaleMode } from "../runtime/figma-image-adapter";

export function mapImageFit(node: Pick<DesignIrImageNode, "fit">): ImageScaleMode {
  switch (node.fit.mode) {
    case "FIT":
    case "NONE": return "FIT";
    case "CROP": return "CROP";
    case "TILE": return "TILE";
    default: return "FILL";
  }
}
