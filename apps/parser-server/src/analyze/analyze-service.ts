import type { AnalyzeWebsiteRequest, AnalyzeWebsiteResponse, ParserRequestId } from "@aio/shared-contracts";
import type { ValidatedTarget } from "../security/inspect-target.js";

export interface WebsiteAnalyzeService {
  analyze(command: {
    requestId: ParserRequestId;
    request: AnalyzeWebsiteRequest;
    target: ValidatedTarget;
    startedAtMs: number;
    nowMs: () => number;
    signal?: AbortSignal;
  }): Promise<AnalyzeWebsiteResponse>;
}
