export function mapTextAlignHorizontal(value: string | undefined): "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED" {
  const normalized = (value ?? "left").toLowerCase();
  if (normalized === "center") return "CENTER";
  if (normalized === "right" || normalized === "end") return "RIGHT";
  if (normalized === "justify") return "JUSTIFIED";
  return "LEFT";
}

export function mapTextAlignVertical(value?: string): "TOP" | "CENTER" | "BOTTOM" {
  const normalized = (value ?? "top").toLowerCase();
  if (normalized === "center" || normalized === "middle") return "CENTER";
  if (normalized === "bottom") return "BOTTOM";
  return "TOP";
}
