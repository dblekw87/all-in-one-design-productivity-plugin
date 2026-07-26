import type { AnalyzeWebsiteRequest, CaptureCapabilities, CaptureMode, CaptureSource, ParserRequestId, SerializableError } from "@aio/shared-contracts";
import type { ValidatedTarget } from "../security/inspect-target.js";

export interface CaptureValidationSuccess {
  ok: true;
  source: CaptureSource;
  target: ValidatedTarget;
}

export interface CaptureValidationFailure {
  ok: false;
  error: SerializableError;
}

export type CaptureValidationResult = CaptureValidationSuccess | CaptureValidationFailure;

export interface CaptureResult {
  source: CaptureSource;
  target: ValidatedTarget;
}

export interface CaptureProvider {
  readonly id: string;
  readonly mode: CaptureMode;
  capabilities(): CaptureCapabilities;
  supports(request: AnalyzeWebsiteRequest): boolean;
  validate(request: AnalyzeWebsiteRequest): Promise<CaptureValidationResult>;
  capture(command: {
    requestId: ParserRequestId;
    request: AnalyzeWebsiteRequest;
    source: CaptureSource;
    target: ValidatedTarget;
    signal?: AbortSignal;
  }): Promise<CaptureResult>;
}
