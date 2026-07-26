import type { AnalyzeWebsiteRequest, CaptureMode, SerializableError } from "@aio/shared-contracts";
import type { CaptureProvider } from "./capture-provider.js";

export class CaptureProviderRegistry {
  private readonly providers = new Map<CaptureMode, CaptureProvider>();

  register(provider: CaptureProvider): void {
    this.providers.set(provider.mode, provider);
  }

  resolve(request: AnalyzeWebsiteRequest): CaptureProvider | { error: SerializableError } {
    const mode = request.captureMode ?? "PUBLIC_URL";
    const provider = this.providers.get(mode);
    if (!provider) {
      return {
        error: {
          code: "CAPTURE_MODE_NOT_SUPPORTED",
          message: `Capture mode ${mode} is not implemented by this parser server.`,
          retryable: false
        }
      };
    }
    if (!provider.supports(request)) {
      return {
        error: {
          code: "CAPTURE_PROVIDER_NOT_FOUND",
          message: `No capture provider supports capture mode ${mode}.`,
          retryable: false
        }
      };
    }
    return provider;
  }

  capabilities() {
    return [...this.providers.values()].map((provider) => provider.capabilities());
  }
}
