import type { DesignIrDocument } from "@aio/design-ir";
import type { FigmaRendererAdapter, RendererNode } from "./node-types";
import type { RenderProgress } from "./render-progress";
import type { RenderSession } from "./render-session";

export interface RenderContext {
  session: RenderSession;
  document: DesignIrDocument;
  adapter: FigmaRendererAdapter;
  abortSignal: AbortSignal;
  options: { placement: "CURRENT_VIEWPORT" | "PAGE_ORIGIN" | "SELECTION_OFFSET"; placeholderPolicy: "CREATE" | "SKIP"; rollbackOnError: boolean; selectRootOnComplete: boolean };
  reportProgress(progress: RenderProgress): void;
  registerCreatedNode(irNodeId: string, figmaNodeId: string): void;
  getFigmaNodeId(irNodeId: string): string | undefined;
  getParentNode(): RendererNode | undefined;
}
