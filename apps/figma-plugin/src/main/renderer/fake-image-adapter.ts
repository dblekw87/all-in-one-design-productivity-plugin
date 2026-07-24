import type { FigmaImageAdapter, ImageScaleMode } from "./runtime/figma-image-adapter";

export class FakeFigmaImageAdapter implements FigmaImageAdapter {
  readonly images = new Map<string, Uint8Array>();
  readonly paints: Array<{ nodeId: string; imageHash: string; scaleMode: ImageScaleMode; background: boolean }> = [];
  private nextHash = 1;
  createImage(bytes: Uint8Array): { hash: string } { const hash = `fake-image-${this.nextHash++}`; this.images.set(hash, bytes); return { hash }; }
  applyImagePaint(nodeId: string, imageHash: string, scaleMode: ImageScaleMode): void { this.paints.push({ nodeId, imageHash, scaleMode, background: false }); }
  applyBackgroundImagePaint(nodeId: string, imageHash: string, scaleMode: ImageScaleMode): void { this.paints.push({ nodeId, imageHash, scaleMode, background: true }); }
}
