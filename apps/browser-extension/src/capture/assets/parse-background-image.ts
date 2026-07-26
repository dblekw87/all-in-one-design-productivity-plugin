export function parseBackgroundImage(value: string): string[] {
  if (!value || value === "none") return [];
  return Array.from(value.matchAll(/url\((?:"([^"]+)"|'([^']+)'|([^)]*))\)/g))
    .map((match) => match[1] || match[2] || match[3] || "")
    .map((url) => url.trim())
    .filter(Boolean);
}
