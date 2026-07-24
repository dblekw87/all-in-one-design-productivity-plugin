import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { basicLandingV1Manifest } from "../fixture-manifest.js";

const root = resolve(import.meta.dirname, "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const css = readFileSync(resolve(root, "public/styles/basic-landing-v1.css"), "utf8");

describe("fixture-basic-landing-v1", () => {
  it("declares a stable fixture manifest", () => {
    expect(basicLandingV1Manifest).toMatchObject({
      id: "fixture-basic-landing-v1",
      version: "1.0",
      route: "/fixtures/basic-landing-v1"
    });
  });

  it("contains the expected semantic structure", () => {
    expect(html).toContain("<header");
    expect(html).toContain("<main");
    expect(html).toContain("<footer");
    expect(html).toContain("class=\"hero\"");
    expect(html.match(/class="feature-card"/g)).toHaveLength(3);
    expect(html).toContain("class=\"cta-section\"");
  });

  it("uses local assets and required fixture elements", () => {
    expect(html).toContain("src=\"/assets/hero-card.png\"");
    expect(html).toContain("<svg aria-hidden=\"true\"");
    expect(html).toContain(" hidden>");
    expect(html).toContain("aria-hidden=\"true\"");
    expect(existsSync(resolve(root, "public/assets/hero-card.png"))).toBe(true);
    expect(existsSync(resolve(root, "public/assets/mark.svg"))).toBe(true);
  });

  it("contains required CSS patterns without external dependencies", () => {
    expect(css).toContain("display: flex");
    expect(css).toContain("display: grid");
    expect(css).toContain("position: absolute");
    expect(css).toContain("::before");
    expect(css).toContain("box-shadow");
    expect(css).toContain("border-radius");
    expect(`${html}\n${css}`).not.toMatch(/https?:\/\//);
    expect(html).not.toContain("<script");
  });
});
