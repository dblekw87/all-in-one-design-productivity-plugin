import type { FigmaRendererAdapter, RendererNode } from "./runtime/node-types";
import type { FigmaFrameAdapter } from "./runtime/figma-frame-adapter";
import type { ChildLayoutMapping, FrameLayoutMapping } from "./layout/index";
import type { FrameVisualMapping } from "./visual/index";
import type { DesignIrNode } from "@aio/design-ir";
import type { GeometryReconciliation } from "./layout/mapping/reconcile-geometry";

class FakeNode implements RendererNode {
  readonly children: RendererNode[] = [];
  readonly pluginData = new Map<string, string>();
  parent?: RendererNode;
  resize(width: number, height: number): void { this.width = width; this.height = height; }
  x = 0; y = 0; width = 0; height = 0; opacity = 1; visible = true;
  layoutMode = "NONE"; layoutWrap = "NO_WRAP"; itemSpacing = 0; counterAxisSpacing = 0;
  paddingTop = 0; paddingRight = 0; paddingBottom = 0; paddingLeft = 0;
  primaryAxisAlignItems = "MIN"; counterAxisAlignItems = "MIN"; primaryAxisSizingMode = "FIXED"; counterAxisSizingMode = "FIXED";
  layoutAlign = "INHERIT"; layoutGrow = 0; layoutPositioning = "AUTO";
  fills: unknown[] = []; strokes: unknown[] = []; strokeWeight = 0; cornerRadii: [number, number, number, number] = [0, 0, 0, 0]; effects: unknown[] = []; clipsContent = false;
  constructor(public readonly id: string, public name: string, public readonly type: string, private readonly owner: FakeFigmaRendererAdapter) {}
  appendChild(child: RendererNode): void { child.parent = this; this.children.push(child); }
  remove(): void { this.owner.removeNode(this.id); }
  setPluginData(key: string, value: string): void { this.pluginData.set(key, value); }
}

export class FakeFigmaRendererAdapter implements FigmaRendererAdapter {
  readonly nodes = new Map<string, FakeNode>();
  readonly selection: RendererNode[] = [];
  private sequence = 0;
  failCreate = false;
  failRemove = false;
  createFrame(): RendererNode { return this.create("FRAME"); }
  createRectangle(): RendererNode { return this.create("RECTANGLE"); }
  createText(): RendererNode { return this.create("TEXT"); }
  resizeNode(id: string, width: number, height: number): void { const node = this.nodes.get(id); if (!node) throw new Error("fake node not found"); node.width = width; node.height = height; }
  private create(type: string): RendererNode { if (this.failCreate) throw new Error("fake create failure"); const item = new FakeNode(`fake_${++this.sequence}`, type, type, this); this.nodes.set(item.id, item); return item; }
  getNodeById(id: string): RendererNode | null { return this.nodes.get(id) ?? null; }
  removeNode(id: string): void { if (this.failRemove) throw new Error("fake remove failure"); this.nodes.delete(id); }
  setSelection(nodes: RendererNode[]): void { this.selection.splice(0, this.selection.length, ...nodes); }
  scrollIntoView(): void { /* fake adapter has no viewport */ }
  getViewportCenter(): { x: number; y: number } { return { x: 500, y: 500 }; }
  getSelectionBounds(): undefined { return undefined; }
}

export class FakeFigmaFrameAdapter implements FigmaFrameAdapter {
  readonly layoutCalls: Array<{ nodeId: string; mapping: FrameLayoutMapping }> = [];
  readonly childLayoutCalls: Array<{ nodeId: string; mapping: ChildLayoutMapping }> = [];
  readonly visualCalls: Array<{ nodeId: string; mapping: FrameVisualMapping }> = [];
  failLayout = false;
  failVisual = false;
  constructor(private readonly renderer: FakeFigmaRendererAdapter) {}
  applyLayout(nodeId: string, mapping: FrameLayoutMapping): void { if (this.failLayout) throw new Error("fake layout failure"); const node = this.get(nodeId); Object.assign(node, mapping); this.layoutCalls.push({ nodeId, mapping }); }
  applyChildLayout(nodeId: string, mapping: ChildLayoutMapping): void { const node = this.get(nodeId); Object.assign(node, mapping); this.childLayoutCalls.push({ nodeId, mapping }); }
  applyVisual(nodeId: string, mapping: FrameVisualMapping): void { if (this.failVisual) throw new Error("fake visual failure"); const node = this.get(nodeId); Object.assign(node, mapping, { cornerRadii: mapping.cornerRadii }); this.visualCalls.push({ nodeId, mapping }); }
  applyClipping(nodeId: string, clipsContent: boolean): void { this.get(nodeId).clipsContent = clipsContent; }
  reconcileGeometry(nodeId: string, node: DesignIrNode): GeometryReconciliation { const target = this.get(nodeId); return { diverged: Math.abs(target.width - node.geometry.width) > 2 || Math.abs(target.height - node.geometry.height) > 2, widthDelta: Math.abs(target.width - node.geometry.width), heightDelta: Math.abs(target.height - node.geometry.height) }; }
  private get(id: string): FakeNode { const node = this.renderer.nodes.get(id); if (!node) throw new Error("fake node not found"); return node; }
}
