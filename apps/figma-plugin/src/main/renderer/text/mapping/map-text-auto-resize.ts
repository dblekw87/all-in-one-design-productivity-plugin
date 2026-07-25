import type { DesignIrSizing } from "@aio/design-ir";

export function mapTextAutoResize(sizing: DesignIrSizing): "NONE" | "WIDTH_AND_HEIGHT" | "HEIGHT" {
  if (sizing.horizontal.mode === "CONTENT" && sizing.vertical.mode === "CONTENT") return "WIDTH_AND_HEIGHT";
  if (sizing.horizontal.mode === "FIXED" || sizing.horizontal.mode === "STRETCH") return "HEIGHT";
  return "WIDTH_AND_HEIGHT";
}
