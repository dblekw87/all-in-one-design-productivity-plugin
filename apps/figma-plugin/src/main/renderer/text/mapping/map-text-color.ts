import type { DesignIrColor } from "@aio/design-ir";
import { PLUGIN_TEXT_POLICY } from "../contracts/text-render-policy";

export function mapTextColor(color: DesignIrColor | undefined) {
  if (!color || !Number.isFinite(color.r) || !Number.isFinite(color.g) || !Number.isFinite(color.b)) {
    return { fill: { type: "SOLID" as const, color: PLUGIN_TEXT_POLICY.fallbackTextColor }, warning: "Text color fell back to black." };
  }
  return {
    fill: {
      type: "SOLID" as const,
      color: { r: clamp01(color.r), g: clamp01(color.g), b: clamp01(color.b) },
      ...(Number.isFinite(color.a) ? { opacity: clamp01(color.a ?? 1) } : {}),
    },
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
