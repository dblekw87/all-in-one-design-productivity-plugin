import type { FigmaRendererAdapter } from "./node-types";
import type { RenderSession } from "./render-session";

export function rollbackSession(session: RenderSession, adapter: FigmaRendererAdapter): { removed: number; failed: number } {
  let removed = 0;
  let failed = 0;
  for (const nodeId of [...session.createdNodeIds].reverse()) {
    try { adapter.removeNode(nodeId); removed += 1; } catch { failed += 1; }
  }
  session.createdNodeIds.length = 0;
  session.irToFigmaNodeId.clear();
  return { removed, failed };
}
