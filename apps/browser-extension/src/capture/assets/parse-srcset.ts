export function parseSrcset(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0] || "")
    .filter(Boolean);
}
