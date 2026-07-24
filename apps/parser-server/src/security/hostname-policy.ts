import { isIP } from "node:net";
import type { SerializableError } from "@aio/shared-contracts";
import { securityError } from "./security-errors.js";

const forbiddenMetadataHostnames = new Set(["metadata.google.internal"]);

export function validateHostname(hostname: string): SerializableError | null {
  if (!hostname) {
    return securityError("HOSTNAME_INVALID", "The target hostname is invalid.");
  }

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return securityError("HOSTNAME_FORBIDDEN", "The target hostname is not allowed.");
  }

  if (forbiddenMetadataHostnames.has(hostname)) {
    return securityError("METADATA_ENDPOINT_BLOCKED");
  }

  if (hostname.includes("_") && !isIP(hostname)) {
    return securityError("HOSTNAME_INVALID", "The target hostname is invalid.");
  }

  return null;
}
