import type { BrowserContext, Route, Request } from "playwright";
import { BrowserRuntimeError } from "../browser-errors.js";
import { normalizeResourceType, type BrowserRequestDescriptor } from "./browser-request-descriptor.js";
import type { SafeRequestInspector } from "./safe-request-inspector.js";
import { RequestLimit } from "./request-limit.js";
import type { MutableSecurityReport } from "./security-report.js";

export interface BrowserNetworkGuardOptions {
  inspector: SafeRequestInspector;
  maxRequests: number;
  maxRedirects: number;
  report: MutableSecurityReport;
}

export class BrowserNetworkGuard {
  private requestSequence = 0;
  private readonly requestIds = new WeakMap<Request, string>();
  private readonly requestLimit: RequestLimit;

  constructor(private readonly options: BrowserNetworkGuardOptions) {
    this.requestLimit = new RequestLimit(options.maxRequests);
  }

  async install(context: BrowserContext): Promise<void> {
    await context.route("**/*", async (route) => {
      await this.handleRoute(route);
    });
  }

  private async handleRoute(route: Route): Promise<void> {
    const request = route.request();
    const limitDecision = this.requestLimit.next();
    if (limitDecision) {
      this.options.report.recordBlocked(limitDecision.code, limitDecision.reason);
      await route.abort("blockedbyclient");
      return;
    }

    try {
      const descriptor = this.toDescriptor(request);
      if (descriptor.redirectedFromRequestId) {
        this.options.report.recordRedirect();
        if (this.options.report.redirectCount > this.options.maxRedirects) {
          this.options.report.recordBlocked("BROWSER_REDIRECT_LIMIT_EXCEEDED", "Too many redirects.");
          await route.abort("blockedbyclient");
          return;
        }
      }

      const decision = await this.options.inspector.inspect(descriptor);
      if (decision.allowed) {
        this.options.report.recordAllowed();
        await route.continue();
        return;
      }

      this.options.report.recordBlocked(decision.code, decision.reason);
      await route.abort("blockedbyclient");
    } catch {
      this.options.report.recordBlocked("BROWSER_REQUEST_BLOCKED", "Browser request inspection failed.");
      await route.abort("blockedbyclient").catch(() => undefined);
    }
  }

  private toDescriptor(request: Request): BrowserRequestDescriptor {
    const redirectedFrom = request.redirectedFrom();
    const descriptor = {
      requestId: this.idFor(request),
      url: request.url(),
      method: request.method(),
      resourceType: normalizeResourceType(request.resourceType()),
      isNavigationRequest: request.isNavigationRequest(),
      frameUrl: request.frame().url()
    };

    if (redirectedFrom) {
      return {
        ...descriptor,
        redirectedFromRequestId: this.idFor(redirectedFrom),
        redirectedFromUrl: redirectedFrom.url()
      };
    }

    return descriptor;
  }

  assertNoBlockedRequests(): void {
    const report = this.options.report.snapshot();
    if (report.blockedRequests > 0) {
      throw new BrowserRuntimeError("BROWSER_REQUEST_BLOCKED", "One or more browser requests were blocked.");
    }
  }

  private idFor(request: Request): string {
    const existing = this.requestIds.get(request);
    if (existing) {
      return existing;
    }
    const id = `browser_req_${++this.requestSequence}`;
    this.requestIds.set(request, id);
    return id;
  }
}
