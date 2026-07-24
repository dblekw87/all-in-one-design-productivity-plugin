import type { AnalyzeWebsiteResponse } from "@aio/shared-contracts";
import type { WebsiteAnalyzeService } from "./analyze-service.js";

export class PlaceholderAnalyzeService implements WebsiteAnalyzeService {
  async analyze(command: Parameters<WebsiteAnalyzeService["analyze"]>[0]): Promise<AnalyzeWebsiteResponse> {
    const processingTimeMs = Math.max(0, command.nowMs() - command.startedAtMs);

    return {
      contractVersion: "1.0",
      requestId: command.requestId,
      status: "NOT_IMPLEMENTED",
      target: {
        normalizedUrl: command.target.normalizedUrl
      },
      viewport: command.request.viewport,
      assets: [],
      warnings: [
        {
          code: "BROWSER_RUNTIME_NOT_IMPLEMENTED",
          message: "Browser analysis is not available yet.",
          severity: "INFO"
        }
      ],
      metrics: {
        processingTimeMs,
        domNodeCount: 0,
        designNodeCount: 0,
        assetCount: 0
      }
    };
  }
}
