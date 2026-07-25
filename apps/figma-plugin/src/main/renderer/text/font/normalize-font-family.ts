const GENERIC_FAMILIES = new Set(["sans-serif", "serif", "monospace", "system-ui", "cursive", "fantasy"]);

export interface NormalizedFontFamily {
  displayName: string;
  key: string;
  generic: boolean;
  nextFontDerived: boolean;
  warnings: string[];
}

export function normalizeFontFamily(value: string): NormalizedFontFamily {
  const warnings: string[] = [];
  let displayName = value.trim().replace(/^["']|["']$/g, "").trim();
  let nextFontDerived = false;
  if (displayName.startsWith("__")) {
    const stripped = displayName.slice(2);
    const parts = stripped.split("_").filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      displayName = parts.join(" ");
      nextFontDerived = true;
      warnings.push("Next font family name was normalized heuristically.");
    }
  }
  displayName = displayName.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  const key = fontFamilyKey(displayName);
  return { displayName, key, generic: GENERIC_FAMILIES.has(key), nextFontDerived, warnings };
}

export function fontFamilyKey(value: string): string {
  return value.trim().toLowerCase().replace(/^["']|["']$/g, "").replace(/[_\s]+/g, " ");
}

export function isGenericFontFamily(value: string): boolean {
  return GENERIC_FAMILIES.has(fontFamilyKey(value));
}
