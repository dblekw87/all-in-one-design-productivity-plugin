import type { ErrorCode } from "@aio/shared-contracts";
import type { DnsResolver } from "../../security/dns-resolver.js";
import { validateWebsiteTarget } from "../../security/inspect-target.js";
import type { BrowserRequestDescriptor, BrowserResourceType } from "./browser-request-descriptor.js";
import { sanitizeBrowserUrl } from "./sanitize-browser-url.js";

export type BrowserSecurityErrorCode = Extract<
  ErrorCode,
  | "BROWSER_PROTOCOL_BLOCKED"
  | "BROWSER_METHOD_BLOCKED"
  | "BROWSER_RESOURCE_TYPE_BLOCKED"
  | "BROWSER_DNS_VALIDATION_FAILED"
  | "BROWSER_IP_NOT_PUBLIC"
  | "BROWSER_REDIRECT_LIMIT_EXCEEDED"
  | "BROWSER_REDIRECT_DOWNGRADE_BLOCKED"
  | "BROWSER_REDIRECT_TARGET_BLOCKED"
  | "BROWSER_REQUEST_BLOCKED"
>;

export type BrowserRequestDecision =
  | {
      allowed: true;
      normalizedUrl: string;
      resourceType: BrowserResourceType;
    }
  | {
      allowed: false;
      code: BrowserSecurityErrorCode | "NETWORK_REQUEST_LIMIT_EXCEEDED";
      reason: string;
      resourceType: BrowserResourceType;
      safeDisplayUrl?: string;
    };

export interface SafeRequestInspectorOptions {
  maxUrlLength: number;
  maxRedirects: number;
  resolver: DnsResolver;
}

export interface SafeRequestInspector {
  inspect(request: BrowserRequestDescriptor): Promise<BrowserRequestDecision>;
}

export class UrlSecuritySafeRequestInspector implements SafeRequestInspector {
  constructor(private readonly options: SafeRequestInspectorOptions) {}

  async inspect(request: BrowserRequestDescriptor): Promise<BrowserRequestDecision> {
    const resourceDecision = inspectResourceType(request.resourceType);
    if (resourceDecision) {
      return resourceDecision;
    }

    const methodDecision = inspectMethod(request);
    if (methodDecision) {
      return methodDecision;
    }

    const specialDecision = inspectSpecialUrl(request);
    if (specialDecision) {
      return specialDecision;
    }

    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return blocked("BROWSER_REQUEST_BLOCKED", "The browser request URL is invalid.", request);
    }

    if (request.redirectedFromUrl) {
      const previous = new URL(request.redirectedFromUrl);
      if (previous.protocol === "https:" && url.protocol !== "https:") {
        return blocked("BROWSER_REDIRECT_DOWNGRADE_BLOCKED", "HTTPS to non-HTTPS redirects are blocked.", request);
      }
    }

    if (url.protocol !== "https:") {
      return blocked("BROWSER_PROTOCOL_BLOCKED", "Only HTTPS browser requests are allowed.", request);
    }

    const validated = await validateWebsiteTarget(request.url, {
      maxUrlLength: this.options.maxUrlLength,
      resolver: this.options.resolver
    });

    if ("error" in validated) {
      return blocked(mapSecurityError(validated.error.code), "The browser request target is not allowed.", request);
    }

    return {
      allowed: true,
      normalizedUrl: validated.normalizedUrl,
      resourceType: request.resourceType
    };
  }
}

function inspectResourceType(resourceType: BrowserResourceType): BrowserRequestDecision | undefined {
  if (resourceType === "websocket") {
    return {
      allowed: false,
      code: "BROWSER_RESOURCE_TYPE_BLOCKED",
      reason: "WebSocket requests are blocked.",
      resourceType
    };
  }

  if (resourceType === "eventsource" || resourceType === "media" || resourceType === "texttrack") {
    return {
      allowed: false,
      code: "BROWSER_RESOURCE_TYPE_BLOCKED",
      reason: "This browser resource type is blocked.",
      resourceType
    };
  }

  return undefined;
}

function inspectMethod(request: BrowserRequestDescriptor): BrowserRequestDecision | undefined {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return undefined;
  }

  return blocked("BROWSER_METHOD_BLOCKED", "This browser request method is blocked.", request);
}

function inspectSpecialUrl(request: BrowserRequestDescriptor): BrowserRequestDecision | undefined {
  if (request.url === "about:blank") {
    return {
      allowed: true,
      normalizedUrl: request.url,
      resourceType: request.resourceType
    };
  }

  if (request.resourceType === "image" && request.url.startsWith("data:image/")) {
    return {
      allowed: true,
      normalizedUrl: request.url,
      resourceType: request.resourceType
    };
  }

  if (request.url.startsWith("data:") || request.url.startsWith("blob:")) {
    return blocked("BROWSER_PROTOCOL_BLOCKED", "This browser request protocol is blocked.", request);
  }

  return undefined;
}

function mapSecurityError(code: ErrorCode): BrowserSecurityErrorCode {
  switch (code) {
    case "DNS_RESOLUTION_FAILED":
    case "DNS_NO_ADDRESS":
      return "BROWSER_DNS_VALIDATION_FAILED";
    case "IP_NOT_PUBLIC":
    case "METADATA_ENDPOINT_BLOCKED":
      return "BROWSER_IP_NOT_PUBLIC";
    default:
      return "BROWSER_REQUEST_BLOCKED";
  }
}

function blocked(
  code: BrowserSecurityErrorCode,
  reason: string,
  request: BrowserRequestDescriptor
): BrowserRequestDecision {
  return {
    allowed: false,
    code,
    reason,
    resourceType: request.resourceType,
    safeDisplayUrl: sanitizeBrowserUrl(request.url)
  };
}
