import type { CaptureSnapshot, CaptureSnapshotMetadata } from "@aio/shared-contracts";
import type { BrowserPageMetadata, ExtensionCaptureSession, StartCaptureResponse } from "../contracts/messages.js";

const CAPTURE_SNAPSHOT_VERSION = "1.0";

export class BrowserExtensionCaptureProvider {
  readonly id = "browser-extension";
  readonly mode = "BROWSER_TAB" as const;

  supports(captureMode: string): boolean {
    return captureMode === this.mode;
  }

  validate(tabId: number, metadata: BrowserPageMetadata): { ok: true } | { ok: false; error: { code: string; message: string; retryable: boolean } } {
    if (!Number.isInteger(tabId) || tabId < 0) {
      return { ok: false, error: { code: "CAPTURE_VALIDATION_FAILED", message: "A valid tabId is required.", retryable: false } };
    }
    if (!metadata.url) {
      return { ok: false, error: { code: "CAPTURE_VALIDATION_FAILED", message: "Page metadata must include a URL.", retryable: true } };
    }
    return { ok: true };
  }

  capture(command: { session: ExtensionCaptureSession; metadata: BrowserPageMetadata; now?: Date }): StartCaptureResponse {
    const validation = this.validate(command.session.tabId, command.metadata);
    if (!validation.ok) return { ok: false, status: "FAILED", session: command.session, error: validation.error };

    const captureTime = (command.now ?? new Date()).toISOString();
    const snapshotMetadata: CaptureSnapshotMetadata = {
      captureMode: this.mode,
      captureProvider: this.id,
      platform: "chrome-extension",
      captureTime,
      locale: command.metadata.language,
      theme: command.metadata.theme,
      devicePixelRatio: command.metadata.devicePixelRatio,
      viewport: {
        width: command.metadata.viewportWidth,
        height: command.metadata.viewportHeight,
        deviceScaleFactor: command.metadata.devicePixelRatio
      },
      scroll: {
        x: command.metadata.scrollX,
        y: command.metadata.scrollY
      }
    };
    const snapshot: CaptureSnapshot = {
      version: CAPTURE_SNAPSHOT_VERSION,
      capture: {
        mode: this.mode,
        providerId: this.id,
        source: {
          mode: this.mode,
          inputUrl: command.metadata.url,
          normalizedUrl: command.metadata.url,
          providerId: this.id,
          trustedLocalInput: true
        }
      },
      document: {
        requestedUrl: command.metadata.url,
        finalUrl: command.metadata.url,
        title: command.metadata.title,
        capturedAt: captureTime
      },
      viewport: snapshotMetadata.viewport,
      scroll: snapshotMetadata.scroll,
      metadata: snapshotMetadata,
      pseudo: { beforeCount: 0, afterCount: 0 },
      svg: { count: 0 },
      screenshots: { captures: [] },
      warnings: [
        {
          code: "CAPTURE_NOT_IMPLEMENTED",
          message: "Step 27 only creates metadata snapshots; DOM/style/geometry capture starts in Step 28.",
          severity: "INFO",
          source: "CAPTURE"
        }
      ],
      metrics: {
        domCount: 0,
        styleCount: 0,
        geometryCount: 0,
        svgCount: 0,
        pseudoCount: 0,
        assetCount: 0,
        warningCount: 1,
        durationMs: 0
      }
    };

    return {
      ok: true,
      status: "CAPTURE_METADATA_READY",
      session: { ...command.session, status: "METADATA_READY", endedAt: captureTime },
      metadata: command.metadata,
      snapshotMetadata,
      snapshot
    };
  }
}
