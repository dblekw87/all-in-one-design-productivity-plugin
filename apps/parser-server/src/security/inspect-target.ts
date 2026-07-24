import type {
  SerializableError,
  WebsiteTargetInspectionRequest,
  WebsiteTargetInspectionResponse
} from "@aio/shared-contracts";
import { isIP } from "node:net";
import type { DnsResolver, ResolvedAddress } from "./dns-resolver.js";
import { validateHostname } from "./hostname-policy.js";
import { classifyAddress } from "./ip-classifier.js";
import { normalizeTargetUrl } from "./normalize-url.js";
import { securityError } from "./security-errors.js";

export interface InspectTargetOptions {
  maxUrlLength: number;
  resolver: DnsResolver;
  now?: () => string;
}

export interface ValidatedTarget {
  normalizedUrl: string;
  hostname: string;
  protocol: "https:";
  resolvedAddresses: ResolvedAddress[];
  validatedAt: string;
}

export async function inspectWebsiteTarget(
  request: WebsiteTargetInspectionRequest,
  options: InspectTargetOptions
): Promise<WebsiteTargetInspectionResponse> {
  const target = await validateWebsiteTarget(request.url, options);
  if ("error" in target) {
    return { safe: false, error: target.error };
  }

  return {
    safe: true,
    normalizedUrl: target.normalizedUrl,
    hostname: target.hostname,
    resolvedAddresses: target.resolvedAddresses.map((address) => address.address)
  };
}

export async function validateWebsiteTarget(
  rawUrl: string,
  options: InspectTargetOptions
): Promise<ValidatedTarget | { error: SerializableError }> {
  const normalized = normalizeTargetUrl(rawUrl, options.maxUrlLength);
  if ("code" in normalized) {
    return { error: normalized };
  }

  const hostnameError = validateHostname(normalized.hostname);
  if (hostnameError) {
    return { error: hostnameError };
  }

  const resolved = await resolveTargetAddresses(normalized.hostname, options.resolver);
  if ("error" in resolved) {
    return resolved;
  }

  const blockedAddress = resolved.addresses.find((address) => classifyAddress(address) !== "PUBLIC");
  if (blockedAddress) {
    return {
      error:
        blockedAddress.address === "169.254.169.254"
          ? securityError("METADATA_ENDPOINT_BLOCKED")
          : securityError("IP_NOT_PUBLIC")
    };
  }

  return {
    normalizedUrl: normalized.normalizedUrl,
    hostname: normalized.hostname,
    protocol: normalized.protocol,
    resolvedAddresses: resolved.addresses,
    validatedAt: (options.now ?? (() => new Date().toISOString()))()
  };
}

async function resolveTargetAddresses(
  hostname: string,
  resolver: DnsResolver
): Promise<{ addresses: ResolvedAddress[] } | { error: SerializableError }> {
  const directFamily = isIP(hostname);
  if (directFamily) {
    return { addresses: [{ address: hostname, family: directFamily as 4 | 6 }] };
  }

  let addresses: ResolvedAddress[];
  try {
    addresses = await resolver.resolve(hostname);
  } catch {
    return { error: securityError("DNS_RESOLUTION_FAILED", "The target hostname could not be resolved.") };
  }

  if (addresses.length === 0) {
    return { error: securityError("DNS_NO_ADDRESS", "The target hostname did not resolve to an address.") };
  }

  return { addresses };
}
