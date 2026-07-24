import { domainToASCII } from "node:url";
import { isIP } from "node:net";
import type { SerializableError } from "@aio/shared-contracts";
import { securityError } from "./security-errors.js";

export interface NormalizedUrl {
  url: URL;
  normalizedUrl: string;
  hostname: string;
  protocol: "https:";
}

export function normalizeTargetUrl(rawUrl: string, maxUrlLength: number): NormalizedUrl | SerializableError {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return securityError("URL_INVALID", "A URL is required.");
  }

  if (trimmed.length > maxUrlLength) {
    return securityError("URL_TOO_LONG", "The target URL is too long.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return securityError("URL_INVALID", "The target URL is invalid.");
  }

  if (parsed.protocol.toLowerCase() !== "https:") {
    return securityError("URL_PROTOCOL_NOT_ALLOWED", "Only HTTPS URLs are allowed.");
  }

  if (parsed.username || parsed.password) {
    return securityError("URL_CREDENTIALS_NOT_ALLOWED", "URLs with embedded credentials are not allowed.");
  }

  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hash = "";

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname) {
    return securityError("HOSTNAME_INVALID", "The target hostname is invalid.");
  }

  parsed.hostname = hostname;

  if ((parsed.protocol === "https:" && parsed.port === "443") || parsed.port === "") {
    parsed.port = "";
  }

  return {
    url: parsed,
    normalizedUrl: parsed.toString(),
    hostname,
    protocol: "https:"
  };
}

export function normalizeHostname(hostname: string): string {
  const withoutBrackets = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  const withoutTrailingDot = withoutBrackets.endsWith(".") ? withoutBrackets.slice(0, -1) : withoutBrackets;
  const lower = withoutTrailingDot.toLowerCase();

  if (isIP(lower)) {
    return lower;
  }

  return domainToASCII(lower);
}
