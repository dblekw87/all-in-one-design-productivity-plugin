import { describe, expect, it } from "vitest";
import { collectPageMetadata } from "../src/content/page-metadata.js";

describe("page metadata", () => {
  it("reads URL, title, viewport, document, scroll, dpr, language, and theme", () => {
    const doc = {
      documentElement: {
        scrollWidth: 1200,
        clientWidth: 800,
        scrollHeight: 1600,
        clientHeight: 600,
        lang: "ko-KR"
      },
      body: { scrollWidth: 1100, clientWidth: 790, scrollHeight: 1400, clientHeight: 590 },
      location: { href: "https://example.com/path" },
      title: "Example"
    } as unknown as Document;
    const view = {
      innerWidth: 800,
      innerHeight: 600,
      scrollX: 5,
      scrollY: 20,
      devicePixelRatio: 2,
      matchMedia: (query: string) => ({ matches: query.includes("light") })
    } as unknown as Window;

    expect(collectPageMetadata(doc, view)).toMatchObject({
      url: "https://example.com/path",
      title: "Example",
      viewportWidth: 800,
      viewportHeight: 600,
      documentWidth: 1200,
      documentHeight: 1600,
      scrollX: 5,
      scrollY: 20,
      devicePixelRatio: 2,
      language: "ko-KR",
      theme: "light"
    });
  });
});
