import { parseDesignIr, validateDesignIrSemantics, type DesignIrNode } from "@aio/design-ir";
import type { RenderDesignIrRequest } from "../contracts/render-request";
import { RendererError } from "../contracts/render-errors";
import type { RenderDesignIrResult, RenderWarning } from "../contracts/render-result";
import { rollbackSession } from "./rollback-manager";
import { createRenderSession } from "./render-session";
import type { RenderProgress } from "./render-progress";
import type { RenderContext } from "./render-context";
import type { RendererRegistry } from "./node-factory";
import type { FigmaRendererAdapter, RendererNode } from "./node-types";
import type { FigmaAssetClient, DownloadedAsset } from "../../assets/contracts/asset-client";
import { createAssetManifestIndex } from "../../assets/client/asset-manifest-index";
import { createRuntimeAssetCache } from "../../assets/runtime/runtime-asset-cache";
import { FIGMA_ASSET_POLICY } from "../../assets/runtime/asset-policy";
import { mapWithConcurrency } from "../../assets/runtime/asset-download-pool";
import type { PreparedAssetRuntime } from "../../assets/contracts/asset-transfer-context";
import type { FigmaImageAdapter } from "./figma-image-adapter";

export interface RendererLimits { maxNodes: number; maxDepth: number; maxWidth: number; maxHeight: number; }
export interface RendererAssetServices { client: FigmaAssetClient; imageAdapter: FigmaImageAdapter; maxAssetBytes?: number; maxTotalBytes?: number; }
const DEFAULT_LIMITS: RendererLimits = { maxNodes: 5_000, maxDepth: 100, maxWidth: 100_000, maxHeight: 100_000 };

export interface RendererRuntime {
  render(request: RenderDesignIrRequest, signal?: AbortSignal, reportProgress?: (progress: RenderProgress) => void): Promise<RenderDesignIrResult>;
}

export function createRendererRuntime(registry: RendererRegistry, adapter: FigmaRendererAdapter, limits: Partial<RendererLimits> = {}, now: () => number = Date.now, assetServices?: RendererAssetServices): RendererRuntime {
  const configured = { ...DEFAULT_LIMITS, ...limits };
  return {
    async render(request, signal = new AbortController().signal, reportProgress: (progress: RenderProgress) => void = () => undefined) {
      const startedAt = now();
      const warnings: RenderWarning[] = [];
      const failures: RenderDesignIrResult["failures"] = [];
      const session = createRenderSession();
      const document = preflight(request.document, configured);
      const totalNodes = countNodes(document.root);
      let completedNodes = 0;
      let placeholderNodeCount = 0;
      let skippedNodeCount = 0;
      let preparedAssets: PreparedAssetRuntime | undefined;
      let cache: ReturnType<typeof createRuntimeAssetCache> | undefined;
      let transferCleanup: (() => Promise<void>) | undefined;
      const report = (progress: RenderProgress) => reportProgress(progress);
      const contextBase = {
        session,
        document,
        adapter,
        abortSignal: signal,
        options: request.options,
        reportProgress: report,
        imageAdapter: assetServices?.imageAdapter,
        registerCreatedNode(irNodeId: string, figmaNodeId: string) {
          if (session.irToFigmaNodeId.has(irNodeId)) throw new RendererError("RENDER_COMMIT_FAILED", "Duplicate IR mapping.", irNodeId);
          session.irToFigmaNodeId.set(irNodeId, figmaNodeId);
          session.createdNodeIds.push(figmaNodeId);
        },
        getFigmaNodeId(irNodeId: string) { return session.irToFigmaNodeId.get(irNodeId); },
      };
      session.status = "RENDERING";
      try {
        report({ stage: request.assetTransfer ? "INDEXING_ASSETS" : "VALIDATING_IR", completedNodes: 0, totalNodes, message: "Render input validated." });
        if (signal.aborted) throw new RendererError("RENDER_CANCELLED", "Rendering was cancelled.");
        if (request.assetTransfer && assetServices) {
          const bindingToAsset = new Map(document.assetBindings.filter((binding) => binding.renderStrategy === "RASTER_IMAGE").map((binding) => [binding.bindingId, binding.assetId]));
          const index = createAssetManifestIndex(request.assetTransfer.manifest, bindingToAsset);
          cache = createRuntimeAssetCache(assetServices.client, assetServices.maxTotalBytes ?? FIGMA_ASSET_POLICY.maxTotalBytes);
          transferCleanup = async () => { report({ stage: "CLEANING_TRANSFER_SESSION", completedNodes, totalNodes, message: "Cleaning asset transfer session." }); try { await assetServices.client.deleteSession({ sessionId: request.assetTransfer!.session.sessionId, accessToken: request.assetTransfer!.session.accessToken }); } finally { cache?.clear(); } };
          const entries = [...new Set(bindingToAsset.values())].map((assetId) => index.assetsById.get(assetId)).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
          report({ stage: "DOWNLOADING_ASSETS", completedNodes: 0, totalNodes, message: `Preparing ${entries.length} raster assets.` });
          const assetsById = new Map<string, DownloadedAsset>();
          const assetCache = cache;
          if (!assetCache) throw new RendererError("RENDER_PREFLIGHT_FAILED", "Asset cache could not be initialized.");
          await mapWithConcurrency(entries, FIGMA_ASSET_POLICY.maxConcurrency, signal, async (entry) => {
            try { assetsById.set(entry.assetId, await assetCache.get(entry, request.assetTransfer!.session.sessionId, request.assetTransfer!.session.accessToken, signal)); }
            catch (error) { if (request.options.assetFailurePolicy === "FAIL_RENDER") throw error; const irNodeId = document.assetBindings.find((binding) => binding.assetId === entry.assetId)?.usageNodeIds[0]; warnings.push({ code: "ASSET_PLACEHOLDER", message: "Raster asset could not be prepared.", ...(irNodeId ? { irNodeId } : {}) }); }
          });
          const imageHashes = new Map<string, string>();
          report({ stage: "CREATING_IMAGES", completedNodes: 0, totalNodes, message: "Creating image resources." });
          for (const asset of assetsById.values()) if (!imageHashes.has(asset.sha256)) imageHashes.set(asset.sha256, assetServices.imageAdapter.createImage(asset.bytes).hash);
          preparedAssets = { assetsById, imageHashesBySha256: imageHashes, warnings: [] };
        }
        const rootResult = await createNode(document.root, undefined, true, 0);
        const rootFigmaNodeId = rootResult?.figmaNodeId;
        session.status = "COMMITTING";
        report({ stage: "COMMITTING", completedNodes, totalNodes, message: "Finalizing rendered nodes." });
        if (request.options.selectRootOnComplete && rootFigmaNodeId) { const root = adapter.getNodeById(rootFigmaNodeId); if (root) { adapter.setSelection([root]); adapter.scrollIntoView(root); } }
        if (transferCleanup) { try { await transferCleanup(); } catch { warnings.push({ code: "ASSET_SESSION_CLEANUP_FAILED", message: "Asset transfer session cleanup failed." }); } }
        session.status = "COMPLETED";
        report({ stage: "COMPLETED", completedNodes, totalNodes, message: "Render completed." });
        return { status: "COMPLETED", ...(rootFigmaNodeId ? { rootFigmaNodeId } : {}), mappings: [...session.irToFigmaNodeId].map(([irNodeId, figmaNodeId]) => ({ irNodeId, figmaNodeId })), metrics: { requestedNodeCount: totalNodes, createdNodeCount: session.createdNodeIds.length, skippedNodeCount, placeholderNodeCount, rollbackNodeCount: 0, durationMs: Math.max(0, now() - startedAt) }, warnings, failures };
      } catch (error) {
        const rendererError = normalizeRendererError(error);
        failures.push({ code: rendererError.code, message: rendererError.message, ...(rendererError.nodeId ? { irNodeId: rendererError.nodeId } : {}) });
        let rollbackNodeCount = 0;
        if (request.options.rollbackOnError) { session.status = "ROLLING_BACK"; report({ stage: "ROLLING_BACK", completedNodes, totalNodes, message: "Rolling back rendered nodes." }); const rollback = rollbackSession(session, adapter); rollbackNodeCount = rollback.removed; if (rollback.failed > 0) warnings.push({ code: "RENDER_ROLLBACK_FAILED", message: "Some generated nodes could not be removed." }); session.status = "ROLLED_BACK"; }
        if (transferCleanup) { try { await transferCleanup(); } catch { warnings.push({ code: "ASSET_SESSION_CLEANUP_FAILED", message: "Asset transfer session cleanup failed." }); } }
        return { status: rendererError.code === "RENDER_CANCELLED" ? "CANCELLED" : request.options.rollbackOnError ? "ROLLED_BACK" : "FAILED", mappings: [...session.irToFigmaNodeId].map(([irNodeId, figmaNodeId]) => ({ irNodeId, figmaNodeId })), metrics: { requestedNodeCount: totalNodes, createdNodeCount: session.createdNodeIds.length, skippedNodeCount, placeholderNodeCount, rollbackNodeCount, durationMs: Math.max(0, now() - startedAt) }, warnings, failures };
      }

      async function createNode(node: DesignIrNode, parent: RendererNode | undefined, isRoot: boolean, depth: number) {
        if (signal.aborted) throw new RendererError("RENDER_CANCELLED", "Rendering was cancelled.", node.id);
        if (node.renderPolicy === "SKIP" || (!node.visibility.visible && node.nodeType !== "DOCUMENT") || (request.options.placeholderPolicy === "SKIP" && ["TEXT", "IMAGE", "VECTOR", "UNSUPPORTED"].includes(node.nodeType))) { skippedNodeCount += 1; warnings.push({ code: "NODE_SKIPPED", message: "Node render policy skipped this node.", irNodeId: node.id }); return undefined; }
        if (depth > configured.maxDepth) throw new RendererError("RENDER_DEPTH_LIMIT_EXCEEDED", "Render depth limit exceeded.", node.id);
        const factory = registry.resolve(node.nodeType);
        const context = { ...contextBase, assets: preparedAssets, getParentNode: () => parent } as RenderContext;
        report({ stage: isRoot ? "CREATING_ROOT" : "CREATING_NODES", completedNodes, totalNodes, currentIrNodeId: node.id, message: "Creating render node." });
        const created = await factory.create(node as never, context);
        context.registerCreatedNode(created.irNodeId, created.figmaNodeId);
        completedNodes += 1;
        if (created.placeholder) placeholderNodeCount += 1;
        const target = adapter.getNodeById(created.figmaNodeId);
        if (!target) throw new RendererError("RENDER_NODE_CREATE_FAILED", "Created Figma node could not be resolved.", node.id);
        if (parent) { try { parent.appendChild(target); } catch { throw new RendererError("RENDER_APPEND_FAILED", "Figma parent append failed.", node.id); } }
        if ("children" in node && created.childContainer) for (const child of node.children ?? []) await createNode(child, target, false, depth + 1);
        return created;
      }
    },
  };
}

function preflight(value: unknown, limits: RendererLimits) { const document = parseDesignIr(value); validateDesignIrSemantics(document); const count = countNodes(document.root); if (count > limits.maxNodes) throw new RendererError("RENDER_NODE_LIMIT_EXCEEDED", "Render node limit exceeded."); visitGeometry(document.root, limits, 0); return document; }
function visitGeometry(node: DesignIrNode, limits: RendererLimits, depth: number): void { if (depth > limits.maxDepth) throw new RendererError("RENDER_DEPTH_LIMIT_EXCEEDED", "Render depth limit exceeded.", node.id); if (node.geometry.width > limits.maxWidth || node.geometry.height > limits.maxHeight) throw new RendererError("RENDER_PREFLIGHT_FAILED", "Render geometry limit exceeded.", node.id); if ("children" in node) for (const child of node.children ?? []) visitGeometry(child, limits, depth + 1); }
function countNodes(node: DesignIrNode): number { return 1 + ("children" in node ? (node.children ?? []).reduce((sum, child) => sum + countNodes(child), 0) : 0); }
function normalizeRendererError(error: unknown): RendererError { if (error instanceof RendererError) return error; const message = error instanceof Error ? error.message : "Renderer execution failed."; if (message.includes("RENDER_FACTORY_NOT_FOUND")) return new RendererError("RENDER_FACTORY_NOT_FOUND", "Renderer factory is not registered."); return new RendererError("RENDER_NODE_CREATE_FAILED", message); }
