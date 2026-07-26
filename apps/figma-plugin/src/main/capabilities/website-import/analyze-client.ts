import {
  analyzeWebsiteResponseSchema,
  type AnalyzeWebsiteRequest,
  type AnalyzeWebsiteResponse
} from "@aio/shared-contracts";
import { runtimeFetch } from "../../runtime/runtime-fetch";

export interface WebsiteAnalyzeClient {
  analyze(url: string, signal: AbortSignal): Promise<AnalyzeWebsiteResponse>;
}

export function createWebsiteAnalyzeClient(baseUrl: string): WebsiteAnalyzeClient {
  const endpoint = `${baseUrl}/v1/imports/analyze`;

  return {
    async analyze(url, signal) {
      const request: AnalyzeWebsiteRequest = {
        contractVersion: "1.0",
        captureMode: "PUBLIC_URL",
        url,
        viewport: { width: 1440, height: 1200, deviceScaleFactor: 1 },
        capture: { mode: "VIEWPORT" },
        options: {
          excludeHidden: true,
          excludeIframes: true,
          excludeCanvas: true,
          includePseudoElements: true
        }
      };
      const response = await runtimeFetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(request),
        credentials: "omit",
        redirect: "error",
      }, signal);

      if (!response.ok) throw new Error(response.status >= 500 ? "ANALYZE_SERVER_ERROR" : "ANALYZE_REQUEST_REJECTED");
      const parsed = analyzeWebsiteResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const path = issue?.path.join(".") || "response";
        throw new Error(`ANALYZE_RESPONSE_INVALID: ${path} ${issue?.message ?? "schema mismatch"}`);
      }
      return parsed.data as AnalyzeWebsiteResponse;
    }
  };
}
