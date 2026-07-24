import { describe, expect, it } from "vitest";
import { parseColor, parseLength, parseNumber } from "../src/normalization/css-values.js";

describe("normalization CSS value parsers", () => {
  it("parses supported lengths without resolving relative units", () => {
    expect(parseLength("24px")).toMatchObject({ parsed: true, value: { type: "PX", value: 24 } });
    expect(parseLength("50%")).toMatchObject({ parsed: true, value: { type: "PERCENT", value: 50 } });
    expect(parseLength("calc(100% - 24px)")).toMatchObject({ parsed: false, value: { type: "UNPARSED" } });
  });

  it("parses numeric keywords without converting them to zero", () => {
    expect(parseNumber("0.5")).toMatchObject({ parsed: true, value: 0.5 });
    expect(parseNumber("auto")).toMatchObject({ parsed: true, value: { type: "KEYWORD", value: "auto" } });
  });

  it("parses colors and preserves unsupported values", () => {
    expect(parseColor("rgb(1, 2, 3)")).toMatchObject({ parsed: true, value: { type: "RGBA", r: 1, g: 2, b: 3, a: 1 } });
    expect(parseColor("transparent")).toMatchObject({ parsed: true, value: { type: "TRANSPARENT" } });
    expect(parseColor("color(display-p3 1 0 0)")).toMatchObject({ parsed: false, value: { type: "UNPARSED" } });
  });
});
