import { describe, expect, it } from "vitest";
import type { DnsResolver } from "../src/security/dns-resolver.js";
import { inspectWebsiteTarget } from "../src/security/inspect-target.js";

function resolver(addresses: string[]): DnsResolver {
  return {
    async resolve() {
      return addresses.map((address) => ({
        address,
        family: address.includes(":") ? 6 : 4
      }));
    }
  };
}

describe("target inspection", () => {
  it("allows public DNS results", async () => {
    const response = await inspectWebsiteTarget(
      { url: "https://example.com" },
      { maxUrlLength: 2048, resolver: resolver(["93.184.216.34"]) }
    );

    expect(response).toMatchObject({
      safe: true,
      normalizedUrl: "https://example.com/"
    });
  });

  it("blocks mixed public and private DNS results", async () => {
    const response = await inspectWebsiteTarget(
      { url: "https://example.com" },
      { maxUrlLength: 2048, resolver: resolver(["93.184.216.34", "10.0.0.1"]) }
    );

    expect(response.safe).toBe(false);
    if (!response.safe) {
      expect(response.error.code).toBe("IP_NOT_PUBLIC");
    }
  });

  it("blocks direct metadata IP", async () => {
    const response = await inspectWebsiteTarget(
      { url: "https://169.254.169.254/latest/meta-data" },
      { maxUrlLength: 2048, resolver: resolver([]) }
    );

    expect(response.safe).toBe(false);
    if (!response.safe) {
      expect(response.error.code).toBe("METADATA_ENDPOINT_BLOCKED");
    }
  });

  it("blocks direct IPv6 loopback", async () => {
    const response = await inspectWebsiteTarget(
      { url: "https://[::1]/" },
      { maxUrlLength: 2048, resolver: resolver([]) }
    );

    expect(response.safe).toBe(false);
    if (!response.safe) {
      expect(response.error.code).toBe("IP_NOT_PUBLIC");
    }
  });

  it("blocks metadata hostnames before DNS", async () => {
    const response = await inspectWebsiteTarget(
      { url: "https://metadata.google.internal" },
      { maxUrlLength: 2048, resolver: resolver(["8.8.8.8"]) }
    );

    expect(response.safe).toBe(false);
    if (!response.safe) {
      expect(response.error.code).toBe("METADATA_ENDPOINT_BLOCKED");
    }
  });

  it("treats DNS failures as unsafe", async () => {
    const failingResolver: DnsResolver = {
      async resolve() {
        throw new Error("dns failed");
      }
    };
    const response = await inspectWebsiteTarget(
      { url: "https://example.com" },
      { maxUrlLength: 2048, resolver: failingResolver }
    );

    expect(response.safe).toBe(false);
    if (!response.safe) {
      expect(response.error.code).toBe("DNS_RESOLUTION_FAILED");
    }
  });

  it("treats empty DNS results as unsafe", async () => {
    const response = await inspectWebsiteTarget(
      { url: "https://example.com" },
      { maxUrlLength: 2048, resolver: resolver([]) }
    );

    expect(response.safe).toBe(false);
    if (!response.safe) {
      expect(response.error.code).toBe("DNS_NO_ADDRESS");
    }
  });
});
