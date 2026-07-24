import { describe, expect, it } from "vitest";
import type { DnsResolver } from "../src/security/dns-resolver.js";
import { validateRedirectChain } from "../src/security/redirect-policy.js";

const publicResolver: DnsResolver = {
  async resolve(hostname) {
    if (hostname === "localhost") {
      return [{ address: "127.0.0.1", family: 4 }];
    }
    if (hostname === "private.example") {
      return [{ address: "10.0.0.1", family: 4 }];
    }
    return [{ address: "93.184.216.34", family: 4 }];
  }
};

describe("redirect policy", () => {
  it("validates HTTPS and relative redirects", async () => {
    const result = await validateRedirectChain("https://example.com/start", ["/next"], {
      maxRedirects: 5,
      maxUrlLength: 2048,
      resolver: publicResolver
    });

    expect("targets" in result).toBe(true);
  });

  it("blocks HTTPS to HTTP downgrade", async () => {
    const result = await validateRedirectChain("https://example.com", ["http://example.com"], {
      maxRedirects: 5,
      maxUrlLength: 2048,
      resolver: publicResolver
    });

    expect("error" in result && result.error.code).toBe("REDIRECT_PROTOCOL_DOWNGRADE");
  });

  it("blocks private redirect targets", async () => {
    const result = await validateRedirectChain("https://example.com", ["https://private.example"], {
      maxRedirects: 5,
      maxUrlLength: 2048,
      resolver: publicResolver
    });

    expect("error" in result && result.error.code).toBe("REDIRECT_TARGET_BLOCKED");
  });

  it("enforces redirect limit", async () => {
    const result = await validateRedirectChain("https://example.com", ["/1", "/2"], {
      maxRedirects: 1,
      maxUrlLength: 2048,
      resolver: publicResolver
    });

    expect("error" in result && result.error.code).toBe("REDIRECT_LIMIT_EXCEEDED");
  });

  it("detects redirect loops", async () => {
    const result = await validateRedirectChain("https://example.com", ["/a", "/a"], {
      maxRedirects: 5,
      maxUrlLength: 2048,
      resolver: publicResolver
    });

    expect("error" in result && result.error.code).toBe("REDIRECT_LIMIT_EXCEEDED");
  });
});
