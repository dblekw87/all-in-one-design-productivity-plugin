import { sanitizeUrlLike } from "../dom/capture-element-metadata.js";
import type { CapturedStyleSnapshot } from "../style/capture-computed-style.js";
import type { CapturedPseudoSnapshot } from "../pseudo/capture-pseudo-element.js";
import { parseBackgroundImage } from "./parse-background-image.js";
import { parseSrcset } from "./parse-srcset.js";
import type { BrowserCaptureContext } from "../runtime/capture-context.js";
import { BROWSER_CAPTURE_LIMITS } from "../runtime/capture-limits.js";

export interface CapturedAssetReference {
  assetReferenceId: string;
  sourceNodeId: string;
  source: "img-src" | "img-current-src" | "srcset" | "source-srcset" | "css-background-image" | "css-mask-image" | "pseudo-background-image" | "pseudo-mask-image" | "svg-image-href" | "video-poster";
  url: string;
  unsupported?: boolean;
  reason?: string;
}

export interface CapturedAssetReferenceSnapshot {
  references: CapturedAssetReference[];
}

export function captureAssetReferences(elementsByCaptureNodeId: Map<string, Element>, styles: CapturedStyleSnapshot, pseudo: CapturedPseudoSnapshot, context: BrowserCaptureContext): CapturedAssetReferenceSnapshot {
  const references: CapturedAssetReference[] = [];
  let nextAsset = 0;
  const push = (sourceNodeId: string, source: CapturedAssetReference["source"], rawUrl: string): void => {
    if (references.length >= BROWSER_CAPTURE_LIMITS.maxAssetReferences) {
      context.truncated = true;
      return;
    }
    const normalized = normalizeAssetUrl(rawUrl);
    if (!normalized.url) return;
    nextAsset += 1;
    references.push({
      assetReferenceId: `asset_ref_${String(nextAsset).padStart(6, "0")}`,
      sourceNodeId,
      source,
      url: normalized.url,
      ...(normalized.unsupported !== undefined ? { unsupported: normalized.unsupported } : {}),
      ...(normalized.reason ? { reason: normalized.reason } : {})
    });
  };

  for (const [captureNodeId, element] of elementsByCaptureNodeId.entries()) {
    if (element instanceof HTMLImageElement) {
      push(captureNodeId, "img-src", element.getAttribute("src") || "");
      push(captureNodeId, "img-current-src", element.currentSrc || "");
      for (const item of parseSrcset(element.getAttribute("srcset") || "")) push(captureNodeId, "srcset", item);
    }
    if (element instanceof HTMLSourceElement) {
      for (const item of parseSrcset(element.getAttribute("srcset") || "")) push(captureNodeId, "source-srcset", item);
    }
    if (element instanceof HTMLVideoElement) push(captureNodeId, "video-poster", element.getAttribute("poster") || "");
    if (element instanceof HTMLCanvasElement) context.addWarning({ code: "ASSET_REFERENCE_UNSUPPORTED", message: "Canvas pixel capture is deferred.", severity: "INFO", sourceNodeId: captureNodeId });
    if (element.tagName.toLowerCase() === "image") push(captureNodeId, "svg-image-href", element.getAttribute("href") || element.getAttribute("xlink:href") || "");
  }

  for (const style of styles.entries) {
    for (const raw of parseBackgroundImage(style.properties["background-image"] || "")) push(style.captureNodeId, "css-background-image", raw);
    for (const raw of parseBackgroundImage(style.properties["mask-image"] || "")) push(style.captureNodeId, "css-mask-image", raw);
  }
  for (const entry of pseudo.entries) {
    for (const raw of parseBackgroundImage(entry.properties["background-image"] || "")) push(entry.parentCaptureNodeId, "pseudo-background-image", raw);
    for (const raw of parseBackgroundImage(entry.properties["mask-image"] || "")) push(entry.parentCaptureNodeId, "pseudo-mask-image", raw);
  }
  return { references };
}

function normalizeAssetUrl(rawUrl: string): { url: string; unsupported?: boolean; reason?: string } {
  if (!rawUrl || rawUrl.startsWith("linear-gradient") || rawUrl.startsWith("radial-gradient")) return { url: "" };
  if (rawUrl.startsWith("blob:")) return { url: rawUrl.slice(0, 2048), unsupported: true, reason: "blob URL is session-local" };
  if (rawUrl.startsWith("data:")) {
    return rawUrl.length > 2048 ? { url: rawUrl.slice(0, 2048), unsupported: true, reason: "data URL truncated" } : { url: rawUrl };
  }
  return { url: sanitizeUrlLike(rawUrl) };
}
