export const DEFAULT_PARSER_SERVER_URL = "http://localhost:4000";

export function getParserServerUrl(): string {
  const configured = (globalThis as { __AIO_PARSER_SERVER_URL__?: string }).__AIO_PARSER_SERVER_URL__;
  return normalizeParserServerUrl(configured ?? DEFAULT_PARSER_SERVER_URL);
}

export function normalizeParserServerUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  const schemeEnd = trimmed.indexOf("://");
  if (schemeEnd <= 0) throw new Error("PARSER_SERVER_URL_INVALID");

  const protocol = trimmed.slice(0, schemeEnd).toLowerCase();
  const authority = trimmed.slice(schemeEnd + 3).split(/[/?#]/, 1)[0] ?? "";
  if (!authority || authority.includes("@")) throw new Error("PARSER_SERVER_URL_INVALID");
  if (protocol !== "https" && !(protocol === "http" && isLocalHost(authority.split(":", 1)[0] ?? ""))) {
    throw new Error("PARSER_SERVER_URL_INVALID");
  }

  return trimmed;
}

function isLocalHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\[|\]/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}
