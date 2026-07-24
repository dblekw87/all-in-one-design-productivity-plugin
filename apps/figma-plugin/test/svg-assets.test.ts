import { describe, expect, it } from "vitest";
import { decodeSvgText } from "../src/main/assets/svg/decode-svg-text.js";
import { preflightSvgText } from "../src/main/assets/svg/preflight-svg-text.js";

describe("SVG asset safeguards", () => {
  it("decodes UTF-8 SVG and removes BOM", () => {
    const bytes = new TextEncoder().encode("\uFEFF<svg />");
    expect(decodeSvgText(bytes, "asset_1", 1024)).toBe("<svg />");
  });

  it("rejects malformed UTF-8 and dangerous SVG contracts", () => {
    expect(() => decodeSvgText(new Uint8Array([0xc3, 0x28]), "asset_1", 1024)).toThrow();
    expect(() => preflightSvgText("<svg><script>alert(1)</script></svg>", "asset_1", 1024)).toThrow();
    expect(() => preflightSvgText("<svg><image href=\"https://evil.test/a.png\" /></svg>", "asset_1", 1024)).toThrow();
  });
});
