import type { BrowserPageMetadata } from "../contracts/messages.js";

export function collectPageMetadata(doc: Document = document, view: Window = window): BrowserPageMetadata {
  const element = doc.documentElement;
  const body = doc.body;
  const documentWidth = Math.max(element.scrollWidth, element.clientWidth, body?.scrollWidth ?? 0, body?.clientWidth ?? 0);
  const documentHeight = Math.max(element.scrollHeight, element.clientHeight, body?.scrollHeight ?? 0, body?.clientHeight ?? 0);
  const theme = view.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : view.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "no-preference";

  return {
    url: doc.location.href,
    title: doc.title,
    viewportWidth: view.innerWidth,
    viewportHeight: view.innerHeight,
    documentWidth,
    documentHeight,
    scrollX: view.scrollX,
    scrollY: view.scrollY,
    devicePixelRatio: view.devicePixelRatio || 1,
    language: element.lang || navigator.language || "en-US",
    theme
  };
}
