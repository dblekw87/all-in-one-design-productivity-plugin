import type { DesignIrDocument } from "@aio/design-ir";
import type { FigmaRendererAdapter, RendererNode } from "./node-types";
import type { RenderProgress } from "./render-progress";
import type { RenderSession } from "./render-session";
import type { PreparedAssetRuntime } from "../../assets/contracts/asset-transfer-context";
import type { FigmaImageAdapter } from "./figma-image-adapter";
import type { FigmaSvgAdapter } from "./figma-svg-adapter";
import type { FigmaTextAdapter } from "../text/adapter/figma-font-adapter";
import type { FontResolver } from "../text/contracts/font-resolver";
import type { FontLoadCache } from "../text/font/font-load-cache";
import type { RenderWarning } from "../contracts/render-result";
import type { FigmaFrameAdapter } from "./figma-frame-adapter";

export interface RenderContext {
  session: RenderSession;
  document: DesignIrDocument;
  adapter: FigmaRendererAdapter;
  abortSignal: AbortSignal;
  options: { placement: "CURRENT_VIEWPORT" | "PAGE_ORIGIN" | "SELECTION_OFFSET"; placeholderPolicy: "CREATE" | "SKIP"; rollbackOnError: boolean; selectRootOnComplete: boolean; assetFailurePolicy?: "PLACEHOLDER" | "FAIL_RENDER"; textFailurePolicy?: "FALLBACK_FONT" | "PLACEHOLDER" | "FAIL_RENDER" };
  assets?: PreparedAssetRuntime;
  imageAdapter?: FigmaImageAdapter;
  svgAdapter?: FigmaSvgAdapter;
  textAdapter?: FigmaTextAdapter;
  frameAdapter?: FigmaFrameAdapter;
  fontResolver?: FontResolver;
  fontLoadCache?: FontLoadCache;
  reportProgress(progress: RenderProgress): void;
  reportWarning(warning: RenderWarning): void;
  registerCreatedNode(irNodeId: string, figmaNodeId: string): void;
  getFigmaNodeId(irNodeId: string): string | undefined;
  getParentNode(): RendererNode | undefined;
}
