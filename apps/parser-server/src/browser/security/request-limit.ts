import type { BrowserRequestDecision } from "./safe-request-inspector.js";

type BlockedRequestDecision = Extract<BrowserRequestDecision, { allowed: false }>;

export class RequestLimit {
  private count = 0;

  constructor(private readonly maxRequests: number) {}

  next(): BlockedRequestDecision | undefined {
    this.count += 1;
    if (this.count > this.maxRequests) {
      return {
        allowed: false,
        code: "NETWORK_REQUEST_LIMIT_EXCEEDED",
        reason: "The page made too many network requests.",
        resourceType: "other"
      };
    }
    return undefined;
  }
}
