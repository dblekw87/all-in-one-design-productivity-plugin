import { useEffect, useMemo, useState } from "react";
import {
  createOperationId,
  PluginMessageType,
  type CapabilityMetadata,
  type CapabilityResult,
  type SerializableError,
  type SelectionSummary
} from "@aio/shared-contracts";
import { createPluginMessageClient } from "./messaging/plugin-message-client";
import { usePluginEvent } from "./messaging/use-plugin-events";

interface PluginState {
  status: "initializing" | "ready" | "error";
  capabilities: CapabilityMetadata[];
  selection: SelectionSummary | null;
  lastResult: CapabilityResult | null;
  errorMessage?: string;
}

export function App() {
  const client = useMemo(() => createPluginMessageClient(), []);
  const [state, setState] = useState<PluginState>({
    status: "initializing",
    capabilities: [],
    selection: null,
    lastResult: null
  });

  useEffect(() => {
    void client
      .request(PluginMessageType.PLUGIN_INITIALIZE_REQUEST, {})
      .then((response) => {
        if (response.type === PluginMessageType.PLUGIN_INITIALIZE_RESPONSE) {
          setState((current) => ({
            ...current,
            status: "ready",
            capabilities: response.payload.capabilities,
            selection: response.payload.selection
          }));
        }
      })
      .catch((error: SerializableError) => {
        setState((current) => ({
          ...current,
          status: "error",
          errorMessage: error.message
        }));
      });

    return () => client.dispose();
  }, [client]);

  usePluginEvent(client, PluginMessageType.SELECTION_CHANGED_EVENT, (event) => {
    setState((current) => ({
      ...current,
      selection: event.payload.selection
    }));
  });

  const websiteImport = state.capabilities.find((capability) => capability.id === "website-import");

  const runWebsiteImport = () => {
    void client
      .request(PluginMessageType.CAPABILITY_RUN_REQUEST, {
        capabilityId: "website-import",
        operationId: createOperationId(),
        input: { url: "https://example.com" }
      })
      .then((response) => {
        if (response.type === PluginMessageType.CAPABILITY_RUN_RESPONSE) {
          setState((current) => ({
            ...current,
            lastResult: response.payload.result
          }));
        }
      });
  };

  return (
    <main className="shell">
      <h1>AIO Design Plugin</h1>
      <section>
        <h2>Available Capability: {websiteImport?.label ?? "None"}</h2>
        <p>Status: {state.status === "ready" ? "Ready" : state.status}</p>
        <p>Selection: {state.selection?.selectionCount ?? 0} nodes</p>
      </section>
      {websiteImport ? (
        <button type="button" onClick={runWebsiteImport}>
          Run smoke
        </button>
      ) : null}
      {state.lastResult ? <p>Last result: {state.lastResult.failures[0]?.code ?? "OK"}</p> : null}
      {state.errorMessage ? <p role="alert">{state.errorMessage}</p> : null}
    </main>
  );
}
