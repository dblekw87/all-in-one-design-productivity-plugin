import { describe, expect, it } from "vitest";
import { classifyIPv4, classifyIPv6 } from "../src/security/ip-classifier.js";

describe("IP address classification", () => {
  it.each(["8.8.8.8", "93.184.216.34"])("allows public IPv4 %s", (address) => {
    expect(classifyIPv4(address)).toBe("PUBLIC");
  });

  it.each([
    "0.1.2.3",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.1.1",
    "172.16.0.1",
    "192.0.0.1",
    "192.0.2.1",
    "192.168.1.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "240.0.0.1",
    "255.255.255.255"
  ])("blocks forbidden IPv4 %s", (address) => {
    expect(classifyIPv4(address)).toBe("FORBIDDEN");
  });

  it("allows public IPv6", () => {
    expect(classifyIPv6("2606:4700:4700::1111")).toBe("PUBLIC");
  });

  it.each(["::", "::1", "fc00::1", "fe80::1", "ff00::1", "2001:db8::1", "::ffff:192.168.0.1", "::ffff:c0a8:1"])(
    "blocks forbidden IPv6 %s",
    (address) => {
      expect(classifyIPv6(address)).toBe("FORBIDDEN");
    }
  );
});
