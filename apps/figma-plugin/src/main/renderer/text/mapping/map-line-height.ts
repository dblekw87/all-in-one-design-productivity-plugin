export function mapLineHeight(value: number | string | undefined, fontSize: number): { lineHeight: { unit: "AUTO" } | { unit: "PIXELS"; value: number }; warning?: string } {
  if (value === undefined || value === "normal") return { lineHeight: { unit: "AUTO" } };
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return { lineHeight: { unit: "PIXELS", value } };
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed.endsWith("px")) {
      const parsed = Number(trimmed.slice(0, -2));
      if (Number.isFinite(parsed) && parsed > 0) return { lineHeight: { unit: "PIXELS", value: parsed } };
    }
    if (trimmed.endsWith("%")) {
      const parsed = Number(trimmed.slice(0, -1));
      if (Number.isFinite(parsed) && parsed > 0) return { lineHeight: { unit: "PIXELS", value: fontSize * parsed / 100 } };
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed > 0) return { lineHeight: { unit: "PIXELS", value: fontSize * parsed } };
  }
  return { lineHeight: { unit: "AUTO" }, warning: "Unsupported line-height fell back to AUTO." };
}
