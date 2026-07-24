import { createNotImplementedResult } from "@aio/shared-contracts";
import type { PluginCapability } from "../contracts";
import { websiteImportInputSchema, type WebsiteImportInput } from "./input-schema";
import { websiteImportMetadata } from "./metadata";

export const websiteImportCapability: PluginCapability<WebsiteImportInput> = {
  metadata: websiteImportMetadata,
  inputSchema: websiteImportInputSchema,
  async validate(_context, input) {
    return {
      valid: true,
      input,
      warnings: []
    };
  },
  async execute(context) {
    context.reportProgress({
      phase: "NOT_IMPLEMENTED",
      progress: 1,
      message: "Website Import execution is not implemented yet."
    });
    return createNotImplementedResult(context.capabilityId, context.operationId);
  }
};
