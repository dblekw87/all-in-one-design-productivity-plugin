import { captureHiddenState, type BrowserHiddenState } from "./capture-hidden-state.js";
import { captureElementMetadata, type BrowserElementMetadata } from "./capture-element-metadata.js";
import { captureSemanticMetadata, type BrowserSemanticMetadata } from "./capture-semantic-metadata.js";
import { normalizeCapturedText } from "./capture-text-node.js";
import { CaptureNodeIdFactory } from "./create-capture-node-id.js";
import type { BrowserCaptureContext } from "../runtime/capture-context.js";
import { cooperativeYield } from "../runtime/capture-context.js";
import { BROWSER_CAPTURE_LIMITS } from "../runtime/capture-limits.js";

export type CapturedNodeType = "DOCUMENT" | "ELEMENT" | "TEXT";

export interface CapturedDomNode {
  captureNodeId: string;
  parentCaptureNodeId?: string;
  childCaptureNodeIds: string[];
  nodeType: CapturedNodeType;
  tagName?: string;
  namespace?: string | null;
  textContent?: string;
  attributes?: Record<string, string>;
  classNames?: string[];
  semantic?: BrowserSemanticMetadata;
  hidden?: BrowserHiddenState;
  sourceOrder: number;
  depth: number;
}

export interface CapturedDomTree {
  rootCaptureNodeId: string;
  nodes: CapturedDomNode[];
}

export interface DomCaptureOutput {
  dom: CapturedDomTree;
  elementsByCaptureNodeId: Map<string, Element>;
}

export async function captureDomTree(doc: Document, context: BrowserCaptureContext): Promise<DomCaptureOutput> {
  const ids = new CaptureNodeIdFactory();
  const rootId = ids.root();
  const nodes: CapturedDomNode[] = [{ captureNodeId: rootId, childCaptureNodeIds: [], nodeType: "DOCUMENT", sourceOrder: 0, depth: 0 }];
  const elementsByCaptureNodeId = new Map<string, Element>();
  let sourceOrder = 1;

  async function visit(node: Node, parentId: string, depth: number): Promise<string | undefined> {
    if (context.shouldStop()) return undefined;
    if (nodes.length >= context.request.options.maxNodes) {
      context.truncated = true;
      context.skippedNodeCount += 1;
      context.addWarning({ code: "CAPTURE_NODE_LIMIT_EXCEEDED", message: "Capture node limit was reached.", severity: "WARNING" });
      return undefined;
    }
    if (depth > context.request.options.maxDepth) {
      context.truncated = true;
      context.skippedNodeCount += 1;
      context.addWarning({ code: "CAPTURE_DEPTH_LIMIT_EXCEEDED", message: "Capture depth limit was reached.", severity: "WARNING" });
      return undefined;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const remaining = BROWSER_CAPTURE_LIMITS.maxTotalTextLength - context.totalTextLength;
      const normalized = normalizeCapturedText(node.textContent ?? "", remaining);
      if (!normalized.text) return undefined;
      const id = ids.next();
      context.totalTextLength += normalized.text.length;
      if (normalized.truncated) context.truncated = true;
      nodes.push({ captureNodeId: id, parentCaptureNodeId: parentId, childCaptureNodeIds: [], nodeType: "TEXT", textContent: normalized.text, sourceOrder: sourceOrder++, depth });
      context.completedNodes += 1;
      await cooperativeYield(context.completedNodes);
      return id;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return undefined;
    const element = node as Element;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const hidden = captureHiddenState(element, style, rect);
    if (hidden.hidden) context.hiddenCount += 1;
    if (hidden.displayNone && !context.request.options.includeHidden) {
      context.skippedNodeCount += 1;
      return undefined;
    }

    const metadata: BrowserElementMetadata = captureElementMetadata(element);
    const id = ids.next();
    elementsByCaptureNodeId.set(id, element);
    const capturedNode: CapturedDomNode = {
      captureNodeId: id,
      parentCaptureNodeId: parentId,
      childCaptureNodeIds: [],
      nodeType: "ELEMENT",
      tagName: metadata.tagName,
      namespace: metadata.namespace,
      attributes: metadata.attributes,
      classNames: metadata.classNames,
      semantic: captureSemanticMetadata(element),
      hidden,
      sourceOrder: sourceOrder++,
      depth
    };
    nodes.push(capturedNode);
    context.completedNodes += 1;
    await cooperativeYield(context.completedNodes);

    if (element.shadowRoot) {
      context.addWarning({ code: "SHADOW_ROOT_UNSUPPORTED", message: "Open Shadow DOM traversal is documented but not expanded in Step 28.", severity: "INFO", sourceNodeId: id });
    }
    if (metadata.tagName === "iframe") {
      context.addWarning({ code: "CROSS_ORIGIN_IFRAME_UNSUPPORTED", message: "iframe inner DOM capture is deferred; element style and geometry are retained.", severity: "INFO", sourceNodeId: id });
    }

    for (const child of Array.from(element.childNodes)) {
      const childId = await visit(child, id, depth + 1);
      if (childId) capturedNode.childCaptureNodeIds.push(childId);
    }
    return id;
  }

  const rootElement = doc.documentElement ?? doc.body;
  if (rootElement) {
    const childId = await visit(rootElement, rootId, 1);
    if (childId) nodes[0]?.childCaptureNodeIds.push(childId);
  }

  return { dom: { rootCaptureNodeId: rootId, nodes }, elementsByCaptureNodeId };
}
