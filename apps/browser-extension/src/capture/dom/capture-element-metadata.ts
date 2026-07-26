const ATTRIBUTE_ALLOWLIST = new Set(["id", "role", "aria-label", "aria-hidden", "aria-expanded", "aria-selected", "aria-current", "alt", "title", "href", "src", "type", "name"]);

export interface BrowserElementMetadata {
  tagName: string;
  namespace: string | null;
  attributes: Record<string, string>;
  classNames: string[];
}

export function captureElementMetadata(element: Element): BrowserElementMetadata {
  const attributes: Record<string, string> = {};
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();
    if (name.startsWith("on") || name === "nonce" || name === "integrity" || name.startsWith("data-")) continue;
    if (!ATTRIBUTE_ALLOWLIST.has(name)) continue;
    if (name === "value") continue;
    attributes[name] = sanitizeAttributeValue(name, attribute.value);
  }
  return {
    tagName: element.tagName.toLowerCase(),
    namespace: element.namespaceURI,
    attributes,
    classNames: Array.from(element.classList).slice(0, 20)
  };
}

function sanitizeAttributeValue(name: string, value: string): string {
  if (name === "href" || name === "src") return sanitizeUrlLike(value);
  return value.slice(0, 300);
}

export function sanitizeUrlLike(value: string, base = document.baseURI): string {
  if (!value) return "";
  try {
    const url = new URL(value, base);
    if (url.protocol === "javascript:") return "";
    url.username = "";
    url.password = "";
    return url.toString().slice(0, 2048);
  } catch {
    return "";
  }
}
