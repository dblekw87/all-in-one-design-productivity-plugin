import { describe, expect, it } from "vitest";
import { CaptureNodeIdFactory, inspectInlineSvgSafety, normalizeCapturedText, parseBackgroundImage, parseSrcset, STYLE_PROPERTY_ALLOWLIST } from "../src/capture/index.js";

describe("browser capture contracts", () => {
  it("creates deterministic node and pseudo ids without text or random input", () => {
    const ids = new CaptureNodeIdFactory();
    expect(ids.root()).toBe("cap_root");
    expect(ids.next()).toBe("cap_000001");
    expect(ids.next()).toBe("cap_000002");
    expect(ids.pseudo("cap_000001", "before")).toBe("cap_000001::before");
  });

  it("normalizes text and enforces length without leaking raw whitespace", () => {
    expect(normalizeCapturedText("  hello\n\tworld\u0000  ", 8)).toEqual({ text: "hello wo", truncated: true });
  });

  it("keeps style capture allowlisted and parses asset references", () => {
    expect(STYLE_PROPERTY_ALLOWLIST).toContain("display");
    expect(STYLE_PROPERTY_ALLOWLIST).toContain("grid-template-columns");
    expect(STYLE_PROPERTY_ALLOWLIST).toContain("background-image");
    expect(parseBackgroundImage('linear-gradient(red, blue), url("/a.png"), url(https://example.com/b.webp)')).toEqual(["/a.png", "https://example.com/b.webp"]);
    expect(parseSrcset("/a.png 1x, /b.png 2x")).toEqual(["/a.png", "/b.png"]);
  });

  it("detects unsafe inline SVG evidence without sanitizing into renderer assets", () => {
    expect(inspectInlineSvgSafety("<svg><script /></svg>")).toMatchObject({ hasScript: true, unsafe: true });
    expect(inspectInlineSvgSafety("<svg viewBox='0 0 1 1'></svg>")).toMatchObject({ unsafe: false });
  });
});
