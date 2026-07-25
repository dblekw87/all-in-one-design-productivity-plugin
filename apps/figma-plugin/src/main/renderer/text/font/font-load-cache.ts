import type { FigmaFontAdapter } from "../adapter/figma-font-adapter";
import { fontFamilyKey } from "./normalize-font-family";
import { normalizeFontStyleKey } from "./normalize-font-style";

export class FontLoadCache {
  private readonly loads = new Map<string, Promise<void>>();
  constructor(private readonly adapter: FigmaFontAdapter) {}

  load(font: { family: string; style: string }, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return Promise.reject(new Error("TEXT_RENDER_CANCELLED"));
    const key = `${fontFamilyKey(font.family)}::${normalizeFontStyleKey(font.style)}`;
    const existing = this.loads.get(key);
    if (existing) return existing;
    const promise = this.adapter.loadFont(font).catch((error) => {
      this.loads.delete(key);
      throw error;
    });
    this.loads.set(key, promise);
    return promise;
  }

  clear(): void {
    this.loads.clear();
  }
}
