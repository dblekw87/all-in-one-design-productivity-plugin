import { describe, expect, it, vi } from "vitest";
import { PluginMessageType, createOperationId } from "@aio/shared-contracts";
import { createProgressReporter } from "../src/main/capabilities/progress-reporter";

describe("progress reporter", () => {
  it("emits progress events with operation and capability ids", () => {
    const operationId = createOperationId();
    const postEvent = vi.fn();
    const reporter = createProgressReporter(operationId, "website-import", postEvent);

    reporter.report({ phase: "TEST", progress: 2, message: "Clamped" });

    expect(postEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: PluginMessageType.CAPABILITY_PROGRESS_EVENT,
        payload: expect.objectContaining({
          operationId,
          capabilityId: "website-import",
          phase: "TEST",
          progress: 1
        })
      })
    );
  });
});
