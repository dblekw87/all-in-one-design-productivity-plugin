import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("plugin UI shell", () => {
  it("opens a large enough plugin window for snapshot import", () => {
    const source = readFileSync(join(process.cwd(), "src/main/bootstrap/create-plugin-runtime.ts"), "utf8");

    expect(source).toContain("width: 720");
    expect(source).toContain("height: 640");
  });

  it("keeps the snapshot textarea usable for large JSON", () => {
    const source = readFileSync(join(process.cwd(), "src/ui/styles.css"), "utf8");

    expect(source).toContain("textarea");
    expect(source).toContain("min-height: 240px");
  });
});
