import type { AnalyzeWebsiteRequest } from "@aio/shared-contracts";
import type { TargetInspector } from "../analyze/target-inspector.js";
import type { CaptureProvider, CaptureResult, CaptureValidationResult } from "./capture-provider.js";

export class PublicUrlCaptureProvider implements CaptureProvider {
  readonly id = "public-url";
  readonly mode = "PUBLIC_URL" as const;

  constructor(private readonly targetInspector: TargetInspector) {}

  capabilities() {
    return {
      mode: this.mode,
      providerId: this.id,
      label: "Public URL",
      supportsRemoteNavigation: true,
      supportsLocalPayload: false,
      implemented: true
    };
  }

  supports(request: AnalyzeWebsiteRequest): boolean {
    return captureMode(request) === this.mode;
  }

  async validate(request: AnalyzeWebsiteRequest): Promise<CaptureValidationResult> {
    const target = await this.targetInspector.inspect(request.url);
    if ("error" in target) return { ok: false, error: target.error };
    return {
      ok: true,
      source: {
        mode: this.mode,
        inputUrl: request.url,
        normalizedUrl: target.normalizedUrl,
        providerId: this.id
      },
      target
    };
  }

  async capture(command: Parameters<CaptureProvider["capture"]>[0]): Promise<CaptureResult> {
    return {
      source: command.source,
      target: command.target
    };
  }
}

function captureMode(request: AnalyzeWebsiteRequest) {
  return request.captureMode ?? "PUBLIC_URL";
}
