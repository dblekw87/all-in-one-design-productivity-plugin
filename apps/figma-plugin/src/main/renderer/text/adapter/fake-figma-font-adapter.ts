import type { RendererNode } from "../../runtime/node-types";
import type { FigmaTextAdapter, TextNodeStyle } from "./figma-font-adapter";

export class FakeFigmaTextAdapter implements FigmaTextAdapter {
  availableFonts: Array<{ family: string; style: string }> = [{ family: "Inter", style: "Regular" }];
  readonly loadCalls: Array<{ family: string; style: string }> = [];
  readonly appliedStyles = new Map<string, Partial<TextNodeStyle>>();
  failList = false;
  readonly failLoads = new Set<string>();
  createTextNode: () => RendererNode;

  constructor(createTextNode: () => RendererNode) {
    this.createTextNode = createTextNode;
  }

  async listAvailableFonts(): Promise<Array<{ family: string; style: string }>> {
    if (this.failList) throw new Error("fake font list failure");
    return this.availableFonts;
  }

  async loadFont(font: { family: string; style: string }): Promise<void> {
    this.loadCalls.push(font);
    if (this.failLoads.has(`${font.family}::${font.style}`)) throw new Error("fake font load failure");
  }

  createText(): RendererNode {
    return this.createTextNode();
  }

  applyTextStyle(nodeId: string, style: Partial<TextNodeStyle>): void {
    this.appliedStyles.set(nodeId, { ...(this.appliedStyles.get(nodeId) ?? {}), ...style });
  }
}
