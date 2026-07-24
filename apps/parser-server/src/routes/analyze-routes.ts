import type { FastifyInstance } from "fastify";
import {
  analyzeWebsiteRequestSchema,
  analyzeWebsiteResponseSchema,
  createParserRequestId,
  type SerializableError
} from "@aio/shared-contracts";
import type { WebsiteAnalyzeService } from "../analyze/analyze-service.js";
import type { TargetInspector } from "../analyze/target-inspector.js";

export interface AnalyzeRouteOptions {
  analyzeService: WebsiteAnalyzeService;
  targetInspector: TargetInspector;
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

    const target = await options.targetInspector.inspect(parsed.data.url);
    if ("error" in target) {
      console.info(`[parser] ANALYZE_TARGET_REJECTED ${target.error.code}`);
      return reply.status(422).send({ error: target.error });
    }

    const startedAtMs = nowMs();
    const controller = new AbortController();
    request.raw.once("close", () => {
      if (!reply.sent) {
        controller.abort();
      }
    });
    const response = await options.analyzeService.analyze({
      requestId: nextRequestId(),
      request: parsed.data,
      target,
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
