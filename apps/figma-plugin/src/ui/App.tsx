import { useEffect, useMemo, useRef, useState } from "react";
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
type WebsiteImportSource = "url" | "snapshot";

export function App() {
  const client = useMemo(() => createPluginMessageClient(), []);
  const [activeTool, setActiveTool] = useState<ToolId>("website-import");
  const [websiteImportSource, setWebsiteImportSource] = useState<WebsiteImportSource>("url");
  const snapshotJsonRef = useRef<HTMLTextAreaElement>(null);
  const [includeScreenshotReference, setIncludeScreenshotReference] = useState(true);
  const [includeEditableLayers, setIncludeEditableLayers] = useState(true);
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
    if (!["website-import", "browser-snapshot-import"].includes(event.payload.capabilityId) || event.payload.operationId !== activeOperationId) return;
    setProgress(event.payload);
    setImportStatus(event.payload.phase === "ANALYZING" ? "ANALYZING" : "RENDERING");
  });

  const websiteImport = state.capabilities.find((capability) => capability.id === "website-import");
  const browserSnapshotImport = state.capabilities.find((capability) => capability.id === "browser-snapshot-import");
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

  const runBrowserSnapshotImport = () => {
    if (!isReady || !browserSnapshotImport) {
      setInputError("Snapshot Import capability is unavailable.");
      return;
    }
    const normalizedSnapshotJson = snapshotJsonRef.current?.value.trim() ?? "";
    if (!normalizedSnapshotJson) {
      setInputError("Snapshot JSON을 붙여넣으세요.");
      return;
    }

    setInputError(undefined);
    setIsImporting(true);
    setImportStatus("VALIDATING");
    const operationId = createOperationId();
    setActiveOperationId(operationId);
    setProgress({ operationId, capabilityId: "browser-snapshot-import", phase: "VALIDATING", progress: 0, message: "Preparing Snapshot preview." });

    window.setTimeout(() => {
      setProgress({ operationId, capabilityId: "browser-snapshot-import", phase: "VALIDATING", progress: 0.05, message: "Validating full browser snapshot." });
      void client
        .request(PluginMessageType.CAPABILITY_RUN_REQUEST, {
          capabilityId: "browser-snapshot-import",
          operationId,
          input: { snapshotJson: normalizedSnapshotJson, options: { includeScreenshotReference, includeEditableLayers } }
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
    }, 0);
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
            Enter a public HTTPS URL or paste a browser Snapshot JSON captured by the Chrome extension.
          </p>
          <div className="source-switch" role="group" aria-label="Website import source">
            <button
              type="button"
              className={websiteImportSource === "url" ? "switch-option active" : "switch-option"}
              onClick={() => setWebsiteImportSource("url")}
              disabled={isImporting}
            >
              URL
            </button>
            <button
              type="button"
              className={websiteImportSource === "snapshot" ? "switch-option active" : "switch-option"}
              onClick={() => setWebsiteImportSource("snapshot")}
              disabled={isImporting}
            >
              Snapshot JSON
            </button>
          </div>
          <form
            className="import-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (websiteImportSource === "url") {
                runWebsiteImport();
              } else {
                runBrowserSnapshotImport();
              }
            }}
          >
            {websiteImportSource === "url" ? (
              <>
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
              </>
            ) : (
              <>
                <label htmlFor="snapshot-json">Snapshot JSON</label>
                <textarea
                  id="snapshot-json"
                  ref={snapshotJsonRef}
                  placeholder="Paste Snapshot JSON copied from the browser extension."
                  disabled={isImporting}
                  required
                />
                <button
                  type="button"
                  onClick={runBrowserSnapshotImport}
                  disabled={isImporting}
                >
                  {isImporting ? "Importing preview..." : "Import snapshot preview"}
                </button>
                <div className="option-stack" aria-label="Snapshot import options">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={includeScreenshotReference}
                      onChange={(event) => setIncludeScreenshotReference(event.target.checked)}
                      disabled={isImporting}
                    />
                    Screenshot Reference
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={includeEditableLayers}
                      onChange={(event) => setIncludeEditableLayers(event.target.checked)}
                      disabled={isImporting}
                    />
                    Editable Layers
                  </label>
                </div>
                <p className="field-note">Imports the full copied browser snapshot so the Figma result keeps the captured page structure.</p>
              </>
            )}
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
              <strong>{websiteImportSource === "url" ? "Public HTTPS only" : "Browser Snapshot JSON"}</strong>
            </div>
            <div>
              <span>Output</span>
              <strong>{websiteImportSource === "url" ? "Editable Figma layers" : "Validated Snapshot input"}</strong>
            </div>
            <div>
              <span>Selection</span>
              <strong>{state.selection?.selectionCount ?? 0} nodes</strong>
            </div>
          </div>
          {!websiteImport && isReady ? <p className="form-error">Website Import capability is unavailable.</p> : null}
          {!browserSnapshotImport && isReady && websiteImportSource === "snapshot" ? <p className="form-error">Snapshot Import capability is unavailable.</p> : null}
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
