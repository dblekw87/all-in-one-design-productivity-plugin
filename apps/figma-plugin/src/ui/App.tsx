import { useEffect, useMemo, useState } from "react";
import {
  createOperationId,
  PluginMessageType,
  type CapabilityMetadata,
  type CapabilityProgress,
  type CapabilityResult,
  type OperationId,
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

type ImportStatus = "IDLE" | "VALIDATING" | "ANALYZING" | "RENDERING" | "COMPLETED" | "FAILED" | "CANCELLED";

type ToolId = "website-import" | "font-replacer" | "ux-writing";

export function App() {
  const client = useMemo(() => createPluginMessageClient(), []);
  const [activeTool, setActiveTool] = useState<ToolId>("website-import");
  const [url, setUrl] = useState("https://example.com");
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus>("IDLE");
  const [activeOperationId, setActiveOperationId] = useState<OperationId>();
  const [progress, setProgress] = useState<CapabilityProgress>();
  const [inputError, setInputError] = useState<string>();
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

  usePluginEvent(client, PluginMessageType.CAPABILITY_PROGRESS_EVENT, (event) => {
    if (event.payload.capabilityId !== "website-import" || event.payload.operationId !== activeOperationId) return;
    setProgress(event.payload);
    setImportStatus(event.payload.phase === "ANALYZING" ? "ANALYZING" : "RENDERING");
  });

  const websiteImport = state.capabilities.find((capability) => capability.id === "website-import");
  const isReady = state.status === "ready";

  const runWebsiteImport = () => {
    if (!isReady || !websiteImport) {
      setInputError("Plugin is still initializing. Please wait until Ready is shown.");
      return;
    }
    const normalizedUrl = url.trim();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      setInputError("유효한 URL을 입력하세요.");
      return;
    }

    const isLocalHttp = parsedUrl.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname);
    if (parsedUrl.protocol !== "https:" && !isLocalHttp) {
      setInputError("HTTPS URL 또는 개발용 localhost HTTP URL을 입력하세요.");
      return;
    }

    setInputError(undefined);
    setIsImporting(true);
    setImportStatus("VALIDATING");
    const operationId = createOperationId();
    setActiveOperationId(operationId);
    setProgress({ operationId, capabilityId: "website-import", phase: "VALIDATING", progress: 0, message: "Validating URL." });
    void client
      .request(PluginMessageType.CAPABILITY_RUN_REQUEST, {
        capabilityId: "website-import",
        operationId,
        input: { url: normalizedUrl }
      }, { timeoutMs: 120_000 })
      .then((response) => {
        if (response.type === PluginMessageType.CAPABILITY_RUN_RESPONSE) {
          setState((current) => ({
            ...current,
            lastResult: response.payload.result
          }));
          setImportStatus(response.payload.result.success ? "COMPLETED" : response.payload.result.failures[0]?.code === "CAPABILITY_CANCELLED" ? "CANCELLED" : "FAILED");
        } else if (response.type === PluginMessageType.PLUGIN_ERROR_RESPONSE) {
          setState((current) => ({
            ...current,
            errorMessage: `${response.payload.error.code}: ${response.payload.error.message}`
          }));
          setImportStatus("FAILED");
        }
      })
      .catch((error: SerializableError) => {
        setState((current) => ({
          ...current,
          errorMessage: error.message
        }));
        setImportStatus("FAILED");
      })
      .finally(() => {
        setIsImporting(false);
        setActiveOperationId(undefined);
      });
  };

  const cancelWebsiteImport = () => {
    if (!activeOperationId) return;
    void client.request(PluginMessageType.CAPABILITY_CANCEL_REQUEST, { operationId: activeOperationId });
  };

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">AIO DESIGN TOOLS</p>
          <h1>Import and refine your design</h1>
        </div>
        <span className={`status-pill status-${state.status}`}>
          <span className="status-dot" />
          {isReady ? "Ready" : state.status}
        </span>
      </header>

      <nav className="tool-tabs" aria-label="Design tools">
        <button
          type="button"
          className={activeTool === "website-import" ? "tab active" : "tab"}
          onClick={() => setActiveTool("website-import")}
        >
          Website Import
        </button>
        <button
          type="button"
          className={activeTool === "font-replacer" ? "tab active" : "tab"}
          onClick={() => setActiveTool("font-replacer")}
        >
          Font Replacer
          <span className="tab-badge">Soon</span>
        </button>
        <button
          type="button"
          className={activeTool === "ux-writing" ? "tab active" : "tab"}
          onClick={() => setActiveTool("ux-writing")}
        >
          UX Writing
          <span className="tab-badge">Soon</span>
        </button>
      </nav>

      {activeTool === "website-import" ? (
        <section className="tool-panel" aria-labelledby="website-import-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">WEBSITE IMPORT</p>
              <h2 id="website-import-title">Bring a website into Figma</h2>
            </div>
            <span className="selection-count">{isImporting ? importStatus : `${state.selection?.selectionCount ?? 0} selected`}</span>
          </div>
          <p className="panel-description">
            Enter a public HTTPS URL to analyze its structure and import editable layers to the canvas.
          </p>
          <form
            className="import-form"
            onSubmit={(event) => {
              event.preventDefault();
              runWebsiteImport();
            }}
          >
            <label htmlFor="website-url">Website URL</label>
            <div className="url-row">
              <input
                id="website-url"
                type="url"
                value={url}
                placeholder="https://example.com"
                onChange={(event) => setUrl(event.target.value)}
                disabled={isImporting}
                required
              />
              <button
                type="button"
                onClick={runWebsiteImport}
                disabled={isImporting}
              >
                {isImporting ? "Importing..." : "Import to canvas"}
              </button>
            </div>
            {inputError ? <p role="alert" className="form-error">{inputError}</p> : null}
          </form>
          {isImporting ? (
            <div className="progress-panel" aria-live="polite">
              <div className="progress-heading">
                <strong>{progress?.message ?? "Preparing import..."}</strong>
                <span>{Math.round((progress?.progress ?? 0) * 100)}%</span>
              </div>
              <progress max="1" value={progress?.progress ?? 0} />
              <button type="button" className="secondary-button" onClick={cancelWebsiteImport}>Cancel</button>
            </div>
          ) : null}
          {websiteImport && state.lastResult ? (
            <div className="result-panel" aria-live="polite">
              <span className="eyebrow">LATEST RUN</span>
              <strong>{state.lastResult.success ? "Import completed" : importStatus === "CANCELLED" ? "Import cancelled" : "Import needs attention"}</strong>
              <span>Created {state.lastResult.createdCount} nodes · {state.lastResult.warnings.length} warnings</span>
              <span>{state.lastResult.failures[0]?.code ?? "No errors reported"}</span>
              {state.lastResult.failures[0]?.message ? <span>{state.lastResult.failures[0].message}</span> : null}
            </div>
          ) : null}
          <div className="import-details">
            <div>
              <span>Source</span>
              <strong>Public HTTPS only</strong>
            </div>
            <div>
              <span>Output</span>
              <strong>Editable Figma layers</strong>
            </div>
            <div>
              <span>Selection</span>
              <strong>{state.selection?.selectionCount ?? 0} nodes</strong>
            </div>
          </div>
          {!websiteImport && isReady ? <p className="form-error">Website Import capability is unavailable.</p> : null}
        </section>
      ) : (
        <section className="tool-panel empty-panel">
          <p className="eyebrow">{activeTool === "font-replacer" ? "FONT REPLACER" : "UX WRITING"}</p>
          <h2>Coming soon</h2>
          <p className="panel-description">This tool will be added to the plugin workspace in a later step.</p>
        </section>
      )}

      {state.errorMessage ? <p role="alert" className="form-error">{state.errorMessage}</p> : null}

    </main>
  );
}
