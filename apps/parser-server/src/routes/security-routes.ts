import type { FastifyInstance } from "fastify";
import { websiteTargetInspectionRequestSchema } from "@aio/shared-contracts";
import type { ParserServerConfig } from "../config.js";
import type { DnsResolver } from "../security/dns-resolver.js";
import { inspectWebsiteTarget } from "../security/inspect-target.js";
import { validationError } from "../security/security-errors.js";

export interface SecurityRouteOptions {
  config: ParserServerConfig;
  resolver: DnsResolver;
}

export function registerSecurityRoutes(app: FastifyInstance, options: SecurityRouteOptions): void {
  if (!options.config.securityInspectionEnabled) {
    return;
  }

  app.post("/v1/security/inspect-target", async (request, reply) => {
    const parsed = websiteTargetInspectionRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        safe: false,
        error: validationError("URL_INVALID", {
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message
          }))
        })
      });
    }

    return inspectWebsiteTarget(parsed.data, {
      maxUrlLength: options.config.maxUrlLength,
      resolver: options.resolver
    });
  });
}
