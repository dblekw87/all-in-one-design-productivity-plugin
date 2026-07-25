import type { FigmaRendererAdapter, RendererNode } from "./runtime/node-types";

class FakeNode implements RendererNode {
  readonly children: RendererNode[] = [];
  readonly pluginData = new Map<string, string>();
  parent?: RendererNode;
  resize(width: number, height: number): void { this.width = width; this.height = height; }
  x = 0; y = 0; width = 0; height = 0; opacity = 1; visible = true;
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
