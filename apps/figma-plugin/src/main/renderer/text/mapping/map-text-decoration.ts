export function mapTextDecoration(value: string | undefined): "NONE" | "UNDERLINE" | "STRIKETHROUGH" {
  const normalized = (value ?? "none").toLowerCase();
  if (normalized.includes("underline")) return "UNDERLINE";
  if (normalized.includes("line-through")) return "STRIKETHROUGH";
  return "NONE";
}

export function mapTextCase(value: string | undefined): "ORIGINAL" | "UPPER" | "LOWER" | "TITLE" {
  const normalized = (value ?? "none").toLowerCase();
  if (normalized === "uppercase") return "UPPER";
  if (normalized === "lowercase") return "LOWER";
  if (normalized === "capitalize") return "TITLE";
  return "ORIGINAL";
}
