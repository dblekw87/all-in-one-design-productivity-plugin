export type RenderErrorCode =
  | "RENDER_INPUT_INVALID"
  | "RENDER_PREFLIGHT_FAILED"
  | "RENDER_NODE_LIMIT_EXCEEDED"
  | "RENDER_DEPTH_LIMIT_EXCEEDED"
  | "RENDER_FACTORY_NOT_FOUND"
  | "RENDER_NODE_CREATE_FAILED"
  | "RENDER_PARENT_NOT_FOUND"
  | "RENDER_APPEND_FAILED"
  | "RENDER_CANCELLED"
  | "RENDER_ROLLBACK_FAILED"
  | "RENDER_COMMIT_FAILED";

export class RendererError extends Error {
  constructor(public readonly code: RenderErrorCode, message: string, public readonly nodeId?: string) {
    super(message);
    this.name = "RendererError";
  }
}
