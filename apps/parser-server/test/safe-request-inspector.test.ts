import { describe, expect, it } from "vitest";
import type { DnsResolver } from "../src/security/dns-resolver.js";
import { UrlSecuritySafeRequestInspector } from "../src/browser/security/safe-request-inspector.js";
import type { BrowserRequestDescriptor } from "../src/browser/security/browser-request-descriptor.js";

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

function descriptor(input: Partial<BrowserRequestDescriptor>): BrowserRequestDescriptor {
  return {
    requestId: "browser_req_test",
    url: "https://example.com/",
    method: "GET",
    resourceType: "document",
    isNavigationRequest: true,
    ...input
  };
}

describe("safe request inspector", () => {
  it("allows public HTTPS GET requests", async () => {
    const inspector = new UrlSecuritySafeRequestInspector({
      maxUrlLength: 2048,
      maxRedirects: 5,
      resolver: resolver(["93.184.216.34"])
    });

    await expect(inspector.inspect(descriptor({}))).resolves.toMatchObject({ allowed: true });
  });

  it.each([
    ["http://example.com/", "BROWSER_PROTOCOL_BLOCKED"],
    ["https://user:pass@example.com/", "BROWSER_REQUEST_BLOCKED"],
    ["https://localhost/", "BROWSER_REQUEST_BLOCKED"]
  ])("blocks unsafe URL %s", async (url, code) => {
    const inspector = new UrlSecuritySafeRequestInspector({
      maxUrlLength: 2048,
      maxRedirects: 5,
      resolver: resolver(["93.184.216.34"])
    });

    await expect(inspector.inspect(descriptor({ url }))).resolves.toMatchObject({ allowed: false, code });
  });

  it("blocks private DNS results and mixed DNS results", async () => {
    const inspector = new UrlSecuritySafeRequestInspector({
      maxUrlLength: 2048,
      maxRedirects: 5,
      resolver: resolver(["93.184.216.34", "10.0.0.1"])
    });

    await expect(inspector.inspect(descriptor({}))).resolves.toMatchObject({
      allowed: false,
      code: "BROWSER_IP_NOT_PUBLIC"
    });
  });

  it("blocks DNS failures", async () => {
    const inspector = new UrlSecuritySafeRequestInspector({
      maxUrlLength: 2048,
      maxRedirects: 5,
      resolver: {
        async resolve() {
          throw new Error("dns failed");
        }
      }
    });

    await expect(inspector.inspect(descriptor({}))).resolves.toMatchObject({
      allowed: false,
      code: "BROWSER_DNS_VALIDATION_FAILED"
    });
  });

  it("applies method and resource type policies", async () => {
    const inspector = new UrlSecuritySafeRequestInspector({
      maxUrlLength: 2048,
      maxRedirects: 5,
      resolver: resolver(["93.184.216.34"])
    });

    await expect(inspector.inspect(descriptor({ method: "POST" }))).resolves.toMatchObject({
      allowed: false,
      code: "BROWSER_METHOD_BLOCKED"
    });
    await expect(inspector.inspect(descriptor({ resourceType: "websocket" }))).resolves.toMatchObject({
      allowed: false,
      code: "BROWSER_RESOURCE_TYPE_BLOCKED"
    });
  });

  it("applies data image, blob, and about blank policies", async () => {
    const inspector = new UrlSecuritySafeRequestInspector({
      maxUrlLength: 2048,
      maxRedirects: 5,
      resolver: resolver(["93.184.216.34"])
    });

    await expect(inspector.inspect(descriptor({ url: "data:image/png;base64,AA==", resourceType: "image" }))).resolves.toMatchObject({
      allowed: true
    });
    await expect(inspector.inspect(descriptor({ url: "about:blank" }))).resolves.toMatchObject({ allowed: true });
    await expect(inspector.inspect(descriptor({ url: "blob:https://example.com/test" }))).resolves.toMatchObject({
      allowed: false,
      code: "BROWSER_PROTOCOL_BLOCKED"
    });
  });

  it("blocks HTTPS to HTTP redirect downgrade", async () => {
    const inspector = new UrlSecuritySafeRequestInspector({
      maxUrlLength: 2048,
      maxRedirects: 5,
      resolver: resolver(["93.184.216.34"])
    });

    await expect(
      inspector.inspect(
        descriptor({
          url: "http://example.com/",
          redirectedFromUrl: "https://example.com/"
        })
      )
    ).resolves.toMatchObject({ allowed: false, code: "BROWSER_REDIRECT_DOWNGRADE_BLOCKED" });
  });
});
