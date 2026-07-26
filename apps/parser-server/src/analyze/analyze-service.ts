import type { AnalyzeWebsiteRequest, AnalyzeWebsiteResponse, CaptureSource, ParserRequestId } from "@aio/shared-contracts";
import type { ValidatedTarget } from "../security/inspect-target.js";

export interface WebsiteAnalyzeService {
  analyze(command: {
    requestId: ParserRequestId;
    request: AnalyzeWebsiteRequest;
    target: ValidatedTarget;
    captureSource?: CaptureSource;
    startedAtMs: number;
    nowMs: () => number;
    signal?: AbortSignal;
  }): Promise<AnalyzeWebsiteResponse>;
}
