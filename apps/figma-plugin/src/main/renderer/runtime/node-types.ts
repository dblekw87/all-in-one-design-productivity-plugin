export interface RendererNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  visible: boolean;
  clipsContent?: boolean;
  children: RendererNode[];
  parent?: RendererNode;
  appendChild(child: RendererNode): void;
  remove(): void;
  setPluginData(key: string, value: string): void;
}

export interface FigmaRendererAdapter {
  createFrame(): RendererNode;
  createRectangle(): RendererNode;
  getNodeById(id: string): RendererNode | null;
  removeNode(id: string): void;
  setSelection(nodes: RendererNode[]): void;
  scrollIntoView(node: RendererNode): void;
  getViewportCenter(): { x: number; y: number };
  getSelectionBounds(): { x: number; y: number; width: number; height: number } | undefined;
}
