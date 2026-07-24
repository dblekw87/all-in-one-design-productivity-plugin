import { describe, expect, it } from "vitest";
import { normalizeTargetUrl } from "../src/security/normalize-url.js";
import { validateHostname } from "../src/security/hostname-policy.js";

describe("security URL parsing and hostname policy", () => {
  it("normalizes valid HTTPS URLs", () => {
    const result = normalizeTargetUrl("https://EXAMPLE.com:443/path#fragment", 2048);

    expect("code" in result).toBe(false);
    if (!("code" in result)) {
      expect(result.normalizedUrl).toBe("https://example.com/path");
      expect(result.hostname).toBe("example.com");
    }
  });

  it.each(["", "not-a-url", "http://example.com", "file:///etc/passwd", "data:text/html,test", "javascript:alert(1)", "ws://example.com", "wss://example.com"])(
    "rejects invalid or disallowed URL %s",
    (url) => {
      expect("code" in normalizeTargetUrl(url, 2048)).toBe(true);
    }
  );

  it("rejects URLs with embedded credentials", () => {
    const result = normalizeTargetUrl("https://user:password@example.com", 2048);

    expect("code" in result && result.code).toBe("URL_CREDENTIALS_NOT_ALLOWED");
  });

  it("enforces maximum URL length", () => {
    const result = normalizeTargetUrl(`https://example.com/${"a".repeat(50)}`, 20);

    expect("code" in result && result.code).toBe("URL_TOO_LONG");
  });

  it("handles trailing dots and punycode", () => {
    const trailingDot = normalizeTargetUrl("https://example.com.", 2048);
    const punycode = normalizeTargetUrl("https://éxample.com", 2048);

    expect(!("code" in trailingDot) && trailingDot.hostname).toBe("example.com");
    expect(!("code" in punycode) && punycode.hostname).toBe("xn--xample-9ua.com");
  });

  it("blocks localhost without blocking notlocalhost.com", () => {
    expect(validateHostname("localhost")?.code).toBe("HOSTNAME_FORBIDDEN");
    expect(validateHostname("sub.localhost")?.code).toBe("HOSTNAME_FORBIDDEN");
    expect(validateHostname("notlocalhost.com")).toBeNull();
  });
});
