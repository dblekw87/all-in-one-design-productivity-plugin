import type { FastifyInstance } from "fastify";
import {
  analyzeWebsiteRequestSchema,
  analyzeWebsiteResponseSchema,
  createParserRequestId,
  type SerializableError
} from "@aio/shared-contracts";
import type { WebsiteAnalyzeService } from "../analyze/analyze-service.js";
import type { CaptureProviderRegistry } from "../capture/capture-provider-registry.js";

export interface AnalyzeRouteOptions {
  analyzeService: WebsiteAnalyzeService;
  captureProviders: CaptureProviderRegistry;
  nowMs?: () => number;
  requestId?: () => `req_${string}`;
}

export function registerAnalyzeRoutes(app: FastifyInstance, options: AnalyzeRouteOptions): void {
  const nowMs = options.nowMs ?? (() => Date.now());
  const nextRequestId = options.requestId ?? createParserRequestId;

  app.post("/v1/imports/analyze", async (request, reply) => {
    console.info("[parser] ANALYZE_START");
    const parsed = analyzeWebsiteRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      console.info("[parser] ANALYZE_REQUEST_INVALID");
      return reply.status(400).send({
        error: createAnalyzeRequestError(
          parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        )
      });
    }

    const provider = options.captureProviders.resolve(parsed.data);
    if (!provider || "error" in provider) {
      const error = provider?.error ?? {
        code: "CAPTURE_PROVIDER_NOT_FOUND" as const,
        message: "No capture provider registry is configured.",
        retryable: false
      };
      console.info(`[parser] ANALYZE_CAPTURE_REJECTED ${error.code}`);
      return reply.status(422).send({ error });
    }
    const validation = await provider.validate(parsed.data);
    if (!validation.ok) {
      console.info(`[parser] ANALYZE_CAPTURE_REJECTED ${validation.error.code}`);
      return reply.status(422).send({ error: validation.error });
    }

    const startedAtMs = nowMs();
    const controller = new AbortController();
    request.raw.once("close", () => {
      if (!reply.sent) {
        controller.abort();
      }
    });
    const requestId = nextRequestId();
    const capture = await provider.capture({
      requestId,
      request: parsed.data,
      source: validation.source,
      target: validation.target,
      signal: controller.signal
    });
    const response = await options.analyzeService.analyze({
      requestId,
      request: parsed.data,
      target: capture.target,
      captureSource: capture.source,
      startedAtMs,
      nowMs,
      signal: controller.signal
    });

    const validatedResponse = analyzeWebsiteResponseSchema.parse(response);
    console.info(`[parser] ANALYZE_COMPLETE ${validatedResponse.status}`);
    return reply.status(200).send(validatedResponse);
  });
}

function createAnalyzeRequestError(issues: Array<{ path: string; message: string }>): SerializableError {
  return {
    code: "ANALYZE_REQUEST_INVALID",
    message: "The analyze request is invalid.",
    retryable: false,
    details: { issues }
  };
}
