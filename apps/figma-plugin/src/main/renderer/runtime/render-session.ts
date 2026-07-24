export type RenderSessionStatus = "CREATED" | "RENDERING" | "COMMITTING" | "COMPLETED" | "ROLLING_BACK" | "ROLLED_BACK" | "CANCELLED" | "FAILED";

export interface RenderSession {
  sessionId: string;
  status: RenderSessionStatus;
  createdNodeIds: string[];
  irToFigmaNodeId: Map<string, string>;
}

export function createRenderSession(sessionId = `render_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`): RenderSession {
  return { sessionId, status: "CREATED", createdNodeIds: [], irToFigmaNodeId: new Map() };
}
