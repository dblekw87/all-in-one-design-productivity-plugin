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
  locked?: boolean;
  clipsContent?: boolean;
  layoutMode?: string;
  layoutWrap?: string;
  itemSpacing?: number;
  counterAxisSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  layoutAlign?: string;
  layoutGrow?: number;
  layoutPositioning?: string;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  textAutoResize?: string;
  fills?: unknown[];
  strokes?: unknown[];
  strokeWeight?: number;
  cornerRadii?: [number, number, number, number];
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomRightRadius?: number;
  bottomLeftRadius?: number;
  effects?: unknown[];
  children: RendererNode[];
  parent?: RendererNode;
  appendChild(child: RendererNode): void;
  remove(): void;
  setPluginData(key: string, value: string): void;
}

export interface FigmaRendererAdapter {
  createFrame(): RendererNode;
  createRectangle(): RendererNode;
  resizeNode(id: string, width: number, height: number): void;
  getNodeById(id: string): RendererNode | null;
  removeNode(id: string): void;
  setSelection(nodes: RendererNode[]): void;
  scrollIntoView(node: RendererNode): void;
  getViewportCenter(): { x: number; y: number };
  getSelectionBounds(): { x: number; y: number; width: number; height: number } | undefined;
}
