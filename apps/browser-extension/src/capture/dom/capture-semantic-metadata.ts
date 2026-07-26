export interface BrowserSemanticMetadata {
  tagName?: string;
  role?: string;
  ariaLabel?: string;
  headingLevel?: number;
  landmarkType?: string;
  listItem: boolean;
  interactive: boolean;
  formControlType?: string;
  imageAlt?: string;
  linkDestinationType?: "hash" | "relative" | "absolute" | "empty";
}

export function captureSemanticMetadata(element: Element): BrowserSemanticMetadata {
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute("role") || undefined;
  const href = element instanceof HTMLAnchorElement ? element.getAttribute("href") || "" : "";
  return {
    tagName,
    ...(role ? { role } : {}),
    ...(element.getAttribute("aria-label") ? { ariaLabel: element.getAttribute("aria-label") || "" } : {}),
    ...(/^h[1-6]$/.test(tagName) ? { headingLevel: Number(tagName.slice(1)) } : {}),
    ...(["header", "nav", "main", "aside", "section", "article", "footer", "form"].includes(tagName) || role ? { landmarkType: ["header", "nav", "main", "aside", "section", "article", "footer", "form"].includes(tagName) ? tagName : role || "" } : {}),
    listItem: tagName === "li",
    interactive: ["button", "a", "input", "textarea", "select", "summary"].includes(tagName) || Boolean(role && ["button", "link", "tab", "menuitem"].includes(role)),
    ...(["input", "textarea", "select"].includes(tagName) ? { formControlType: tagName } : {}),
    ...(element instanceof HTMLImageElement ? { imageAlt: element.alt } : {}),
    ...(tagName === "a" ? { linkDestinationType: classifyLink(href) } : {})
  };
}

function classifyLink(href: string): "hash" | "relative" | "absolute" | "empty" {
  if (!href) return "empty";
  if (href.startsWith("#")) return "hash";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(href)) return "absolute";
  return "relative";
}
