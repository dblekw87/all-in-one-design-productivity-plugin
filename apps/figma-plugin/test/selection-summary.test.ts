import { describe, expect, it } from "vitest";
import { createSelectionSignature, createSelectionSummary } from "../src/main/selection/selection-summary";

describe("selection summary", () => {
  it("summarizes empty selection", () => {
    expect(createSelectionSummary([], "page-1", 0)).toMatchObject({
      selectionCount: 0,
      nodeTypes: [],
      pageId: "page-1",
      version: 0
    });
  });

  it("counts text and frame nodes", () => {
    const summary = createSelectionSummary(
      [
        { id: "text-1", name: "Title", type: "TEXT" },
        { id: "frame-1", name: "Card", type: "FRAME" }
      ],
      "page-1",
      3
    );

    expect(summary.textNodeCount).toBe(1);
    expect(summary.frameNodeCount).toBe(1);
    expect(summary.selectionCount).toBe(2);
    expect(summary.version).toBe(3);
  });

  it("creates stable signatures for identical selection", () => {
    const selection = [{ id: "node-1", name: "Node", type: "FRAME" }];

    expect(createSelectionSignature(selection, "page-1")).toBe(createSelectionSignature(selection, "page-1"));
  });
});
