import type { DesignIrTextNode } from "@aio/design-ir";
import type { DesignIrNodeFactory } from "../runtime/node-factory";
import type { RenderContext } from "../runtime/render-context";
import { RendererError } from "../contracts/render-errors";
import { applyNodeBasics } from "./factory-helpers";
import { textPlaceholderFactory } from "./text-placeholder-factory";
import { PLUGIN_TEXT_POLICY } from "../text/contracts/text-render-policy";
import { TextRenderError } from "../text/contracts/text-errors";
import { mapTextColor } from "../text/mapping/map-text-color";
import { mapTextAlignHorizontal, mapTextAlignVertical } from "../text/mapping/map-text-align";
import { mapLineHeight } from "../text/mapping/map-line-height";
import { mapLetterSpacing } from "../text/mapping/map-letter-spacing";
import { mapTextAutoResize } from "../text/mapping/map-text-auto-resize";
import { mapTextCase, mapTextDecoration } from "../text/mapping/map-text-decoration";

export const textNodeFactory: DesignIrNodeFactory<DesignIrTextNode> = {
  nodeType: "TEXT",
  async create(node, context) {
    if (!context.textAdapter || !context.fontResolver || !context.fontLoadCache) return textPlaceholderFactory.create(node, context);
    let createdTextNodeId: string | undefined;
    try {
      assertNotCancelled(context.abortSignal, node.id);
      validateTextNode(node);
      const characters = sanitizeCharacters(node.text);
      context.reportProgress({ stage: "RESOLVING_FONTS", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Resolving text font." });
      const resolved = await context.fontResolver.resolve({
        fontFamilies: node.typography.fontFamilies,
        ...(node.typography.fontWeight !== undefined ? { fontWeight: node.typography.fontWeight } : {}),
        ...(node.typography.fontStyle !== undefined ? { fontStyle: node.typography.fontStyle } : {}),
      });
      assertNotCancelled(context.abortSignal, node.id);
      if (!resolved) throw new TextRenderError("FONT_RESOLUTION_FAILED", "No Figma font was available.", node.id);
      for (const warning of resolved.warnings) context.reportWarning({ code: "FONT_FALLBACK_USED", message: warning, irNodeId: node.id });
      if (resolved.source !== "EXACT") context.reportWarning({ code: "FONT_FALLBACK_USED", message: "Text font was resolved through fallback.", irNodeId: node.id });
      context.reportProgress({ stage: "LOADING_FONTS", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Loading text font." });
      try {
        await context.fontLoadCache.load({ family: resolved.family, style: resolved.style }, context.abortSignal);
      } catch {
        throw new TextRenderError("FONT_LOAD_FAILED", "Figma font failed to load.", node.id);
      }
      assertNotCancelled(context.abortSignal, node.id);
      context.reportProgress({ stage: "CREATING_TEXT_NODES", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Creating text node." });
      const target = context.textAdapter.createText();
      createdTextNodeId = target.id;
      context.registerCreatedNode(node.id, target.id);
      applyNodeBasics(target, node, context);
      target.setPluginData("aio:renderType", "TEXT");
      target.setPluginData("aio:fontSource", resolved.source === "EXACT" ? "EXACT" : "FALLBACK");
      assertNotCancelled(context.abortSignal, node.id);
      const fontSize = mapFontSize(node.typography.fontSize);
      const color = mapTextColor(node.typography.color);
      if (color.warning) context.reportWarning({ code: "TEXT_COLOR_INVALID", message: color.warning, irNodeId: node.id });
      const lineHeight = mapLineHeight(node.typography.lineHeight, fontSize);
      if (lineHeight.warning) context.reportWarning({ code: "TEXT_LINE_HEIGHT_INVALID", message: lineHeight.warning, irNodeId: node.id });
      const letterSpacing = mapLetterSpacing(node.typography.letterSpacing, fontSize);
      if (letterSpacing.warning) context.reportWarning({ code: "TEXT_LETTER_SPACING_INVALID", message: letterSpacing.warning, irNodeId: node.id });
      context.reportProgress({ stage: "APPLYING_TYPOGRAPHY", completedNodes: 0, totalNodes: context.document.metrics.totalNodeCount, currentIrNodeId: node.id, message: "Applying text typography." });
      context.textAdapter.applyTextStyle(target.id, {
        fontName: { family: resolved.family, style: resolved.style },
        characters,
        fontSize,
        fills: [color.fill],
        textAlignHorizontal: mapTextAlignHorizontal(node.typography.textAlign),
        textAlignVertical: mapTextAlignVertical(),
        lineHeight: lineHeight.lineHeight,
        letterSpacing: letterSpacing.letterSpacing,
        textDecoration: mapTextDecoration(node.typography.textDecoration),
        textCase: mapTextCase(node.typography.textTransform),
        textAutoResize: mapTextAutoResize(node.sizing),
      });
      assertNotCancelled(context.abortSignal, node.id);
      applyTextGeometry(target.id, node, context);
      return { irNodeId: node.id, figmaNodeId: target.id, childContainer: false, placeholder: false, registered: true };
    } catch (error) {
      if (error instanceof TextRenderError && error.code === "TEXT_RENDER_CANCELLED") throw new RendererError("RENDER_CANCELLED", "Rendering was cancelled.", node.id);
      if (context.options.textFailurePolicy === "FAIL_RENDER") throw normalizeTextFailure(error, node.id);
      if (createdTextNodeId) discardRegisteredNode(context, node.id, createdTextNodeId);
      context.reportWarning({ code: error instanceof TextRenderError ? error.code : "TEXT_PLACEHOLDER_CREATED", message: "Text node fell back to placeholder.", irNodeId: node.id });
      return textPlaceholderFactory.create(node, context);
    }
  },
};

function validateTextNode(node: DesignIrTextNode): void {
  if (!Array.isArray(node.typography.fontFamilies)) throw new TextRenderError("TEXT_INPUT_INVALID", "Text font families are invalid.", node.id);
  if (node.text.length > PLUGIN_TEXT_POLICY.maxTextLength) throw new TextRenderError("TEXT_LENGTH_LIMIT_EXCEEDED", "Text length exceeded plugin limit.", node.id);
  if ("children" in node) throw new TextRenderError("TEXT_INPUT_INVALID", "Text node cannot have children.", node.id);
}

function sanitizeCharacters(value: string | undefined | null): string {
  return (value ?? "").split(String.fromCharCode(0)).join("");
}

function mapFontSize(value: number | undefined): number {
  if (!Number.isFinite(value) || !value || value <= 0) return 16;
  return Math.min(PLUGIN_TEXT_POLICY.maxFontSize, Math.max(PLUGIN_TEXT_POLICY.minFontSize, value));
}

function applyTextGeometry(targetId: string, node: DesignIrTextNode, context: RenderContext): void {
  if (!Number.isFinite(node.geometry.width) || !Number.isFinite(node.geometry.height)) throw new TextRenderError("TEXT_GEOMETRY_APPLY_FAILED", "Text geometry was invalid.", node.id);
  if (node.geometry.width > 0 && node.geometry.height > 0 && (node.sizing.horizontal.mode !== "CONTENT" || node.sizing.vertical.mode === "FIXED")) {
    context.adapter.resizeNode(targetId, node.geometry.width, node.geometry.height);
  }
}

function discardRegisteredNode(context: RenderContext, irNodeId: string, figmaNodeId: string): void {
  try { context.adapter.removeNode(figmaNodeId); } catch { /* rollback will handle remaining generated nodes */ }
  context.session.irToFigmaNodeId.delete(irNodeId);
  const index = context.session.createdNodeIds.lastIndexOf(figmaNodeId);
  if (index >= 0) context.session.createdNodeIds.splice(index, 1);
}

function assertNotCancelled(signal: AbortSignal, irNodeId: string): void {
  if (signal.aborted) throw new TextRenderError("TEXT_RENDER_CANCELLED", "Text rendering was cancelled.", irNodeId);
}

function normalizeTextFailure(error: unknown, irNodeId: string): RendererError {
  if (error instanceof TextRenderError) return new RendererError("RENDER_NODE_CREATE_FAILED", error.message, irNodeId);
  return new RendererError("RENDER_NODE_CREATE_FAILED", "Text node could not be rendered.", irNodeId);
}
