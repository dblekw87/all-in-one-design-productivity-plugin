import type { SerializableError } from "@aio/shared-contracts";
import type { DnsResolver } from "./dns-resolver.js";
import { validateWebsiteTarget, type ValidatedTarget } from "./inspect-target.js";
import { securityError } from "./security-errors.js";

export interface RedirectValidationOptions {
  maxRedirects: number;
  maxUrlLength: number;
  resolver: DnsResolver;
}

export async function validateRedirectChain(
  initialUrl: string,
  locations: readonly string[],
  options: RedirectValidationOptions
): Promise<{ targets: ValidatedTarget[] } | { error: SerializableError }> {
  if (locations.length > options.maxRedirects) {
    return { error: securityError("REDIRECT_LIMIT_EXCEEDED", "Too many redirects.") };
  }

  const visited = new Set<string>();
  const targets: ValidatedTarget[] = [];
  let current = initialUrl;

  for (const location of locations) {
    const next = new URL(location, current).toString();
    if (visited.has(next)) {
      return { error: securityError("REDIRECT_LIMIT_EXCEEDED", "Redirect loop detected.") };
    }
    visited.add(next);

    const previous = new URL(current);
    const targetUrl = new URL(next);
    if (previous.protocol === "https:" && targetUrl.protocol !== "https:") {
      return { error: securityError("REDIRECT_PROTOCOL_DOWNGRADE", "HTTPS to HTTP redirects are not allowed.") };
    }

    const validated = await validateWebsiteTarget(next, options);
    if ("error" in validated) {
      return { error: securityError("REDIRECT_TARGET_BLOCKED", "A redirect target is not allowed.") };
    }

    targets.push(validated);
    current = validated.normalizedUrl;
  }

  return { targets };
}
