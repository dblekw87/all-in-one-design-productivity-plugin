import { isIP } from "node:net";
import type { ResolvedAddress } from "./dns-resolver.js";

export type IpClassification = "PUBLIC" | "FORBIDDEN" | "INVALID";

export function classifyAddress(address: ResolvedAddress): IpClassification {
  if (address.family === 4) {
    return classifyIPv4(address.address);
  }

  return classifyIPv6(address.address);
}

export function classifyIPv4(address: string): IpClassification {
  const value = ipv4ToNumber(address);
  if (value === null) {
    return "INVALID";
  }

  const forbiddenRanges: Array<[number, number]> = [
    [0x00000000, 0xff000000],
    [0x0a000000, 0xff000000],
    [0x64400000, 0xffc00000],
    [0x7f000000, 0xff000000],
    [0xa9fe0000, 0xffff0000],
    [0xac100000, 0xfff00000],
    [0xc0000000, 0xffffff00],
    [0xc0000200, 0xffffff00],
    [0xc0a80000, 0xffff0000],
    [0xc6120000, 0xfffe0000],
    [0xc6336400, 0xffffff00],
    [0xcb007100, 0xffffff00],
    [0xe0000000, 0xf0000000],
    [0xf0000000, 0xf0000000],
    [0xffffffff, 0xffffffff]
  ];

  return forbiddenRanges.some(([range, mask]) => ((value & mask) >>> 0) === range) ? "FORBIDDEN" : "PUBLIC";
}

export function classifyIPv6(address: string): IpClassification {
  const normalized = normalizeIPv6(address);
  if (!normalized) {
    return "INVALID";
  }

  if (normalized === "::" || normalized === "::1") {
    return "FORBIDDEN";
  }

  const dottedMapped = getDottedIPv4MappedIPv6(normalized);
  if (dottedMapped) {
    return classifyIPv4(dottedMapped) === "PUBLIC" ? "PUBLIC" : "FORBIDDEN";
  }

  const value = ipv6ToBigInt(normalized);
  if (value === null) {
    return "INVALID";
  }

  const mapped = getIPv4MappedIPv6(normalized, value);
  if (mapped) {
    return classifyIPv4(mapped) === "PUBLIC" ? "PUBLIC" : "FORBIDDEN";
  }

  const forbiddenRanges: Array<[bigint, bigint]> = [
    [0xfc00n << 112n, 0xfe00n << 112n],
    [0xfe80n << 112n, 0xffc0n << 112n],
    [0xff00n << 112n, 0xff00n << 112n],
    [0x20010db8n << 96n, 0xffffffffn << 96n],
    [0n, (1n << 128n) - 1n]
  ];

  if (forbiddenRanges.some(([range, mask]) => (value & mask) === range)) {
    return "FORBIDDEN";
  }

  return "PUBLIC";
}

export function isDirectIpAddress(hostname: string): 0 | 4 | 6 {
  const family = isIP(hostname);
  return family === 4 || family === 6 ? family : 0;
}

function ipv4ToNumber(address: string): number | null {
  const parts = address.split(".");
  if (parts.length !== 4) {
    return null;
  }

  let value = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      return null;
    }
    const octet = Number(part);
    if (octet < 0 || octet > 255) {
      return null;
    }
    value = (value << 8) + octet;
  }

  return value >>> 0;
}

function normalizeIPv6(address: string): string | null {
  const trimmed = address.toLowerCase();
  return isIP(trimmed) === 6 ? trimmed : null;
}

function getIPv4MappedIPv6(address: string, value: bigint): string | null {
  if ((value >> 32n) === 0xffffn) {
    const ipv4Value = Number(value & 0xffffffffn);
    return [
      (ipv4Value >>> 24) & 255,
      (ipv4Value >>> 16) & 255,
      (ipv4Value >>> 8) & 255,
      ipv4Value & 255
    ].join(".");
  }

  return null;
}

function getDottedIPv4MappedIPv6(address: string): string | null {
  const lower = address.toLowerCase();
  if (!lower.startsWith("::ffff:")) {
    return null;
  }

  const ipv4 = lower.slice("::ffff:".length);
  return classifyIPv4(ipv4) === "INVALID" ? null : ipv4;
}

function ipv6ToBigInt(address: string): bigint | null {
  const [head = "", tail = ""] = address.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];

  if (address.includes("::") && address.split("::").length > 2) {
    return null;
  }

  const missing = 8 - (headParts.length + tailParts.length);
  if (missing < 0) {
    return null;
  }

  const parts = address.includes("::")
    ? [...headParts, ...Array<string>(missing).fill("0"), ...tailParts]
    : headParts;

  if (parts.length !== 8) {
    return null;
  }

  let value = 0n;
  for (const part of parts) {
    if (!/^[0-9a-f]{1,4}$/.test(part)) {
      return null;
    }
    value = (value << 16n) + BigInt(Number.parseInt(part, 16));
  }

  return value;
}
