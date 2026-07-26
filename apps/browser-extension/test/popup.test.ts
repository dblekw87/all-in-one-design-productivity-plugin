import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("popup", () => {
  it("declares required runtime and capture controls", () => {
    const html = readFileSync(join(process.cwd(), "popup.html"), "utf8");
    expect(html).toContain('id="extension-version"');
    expect(html).toContain('id="connection-status"');
    expect(html).toContain('id="current-url"');
    expect(html).toContain('id="current-title"');
    expect(html).toContain('id="capture-mode"');
    expect(html).toContain('id="capture-button"');
    expect(html).toContain('id="diagnostics-button"');
    expect(html).toContain('id="settings-button"');
  });
});
