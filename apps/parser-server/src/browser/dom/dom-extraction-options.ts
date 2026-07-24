import type { AnalyzeOptions } from "@aio/shared-contracts";

export interface DomExtractionOptions extends AnalyzeOptions {
  maxDepth: number;
  maxNodes: number;
  maxTextNodeLength: number;
}
