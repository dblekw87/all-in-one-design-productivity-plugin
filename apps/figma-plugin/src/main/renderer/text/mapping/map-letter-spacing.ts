export function mapLetterSpacing(value: number | string | undefined, fontSize: number): { letterSpacing: { unit: "PIXELS" | "PERCENT"; value: number }; warning?: string } {
  if (value === undefined || value === "normal") return { letterSpacing: { unit: "PIXELS", value: 0 } };
  if (typeof value === "number" && Number.isFinite(value)) return { letterSpacing: { unit: "PIXELS", value } };
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed.endsWith("px")) {
      const parsed = Number(trimmed.slice(0, -2));
      if (Number.isFinite(parsed)) return { letterSpacing: { unit: "PIXELS", value: parsed } };
    }
    if (trimmed.endsWith("%")) {
      const parsed = Number(trimmed.slice(0, -1));
      if (Number.isFinite(parsed)) return { letterSpacing: { unit: "PERCENT", value: parsed } };
    }
    if (trimmed.endsWith("em")) {
      const parsed = Number(trimmed.slice(0, -2));
      if (Number.isFinite(parsed)) return { letterSpacing: { unit: "PIXELS", value: parsed * fontSize } };
    }
  }
  return { letterSpacing: { unit: "PIXELS", value: 0 }, warning: "Unsupported letter-spacing fell back to 0." };
}
