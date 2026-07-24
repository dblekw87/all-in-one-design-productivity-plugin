import type { AssetTransferSessionResponse } from "@aio/shared-contracts";
import type { DesignIrAssetBinding, DesignIrDocument } from "@aio/design-ir";
import type { RuntimeResolvedAsset } from "../assets/resolution/resolve-assets.js";
import type { ImportSessionLimits } from "./import-session-limits.js";
import type { ImportSessionStore, RuntimeTransferAsset } from "./import-session-store.js";

function mediaType(value: string): RuntimeTransferAsset["mediaType"] | undefined {
  switch (value) {
    case "IMAGE_PNG": return "image/png";
    case "IMAGE_JPEG": return "image/jpeg";
    case "IMAGE_WEBP": return "image/webp";
    case "IMAGE_GIF": return "image/gif";
    case "IMAGE_AVIF": return "image/avif";
    case "IMAGE_SVG": return "image/svg+xml";
    default: return undefined;
  }
}

export function createAssetTransferSession(
  store: ImportSessionStore,
  document: DesignIrDocument,
  runtimeAssets: RuntimeResolvedAsset[],
  limits: ImportSessionLimits
): AssetTransferSessionResponse | undefined {
  const bindingByAsset = new Map<string, DesignIrAssetBinding[]>();
  for (const binding of document.assetBindings) {
    const list = bindingByAsset.get(binding.assetId) ?? [];
    list.push(binding);
    bindingByAsset.set(binding.assetId, list);
  }

  const assets: RuntimeTransferAsset[] = [];
  for (const runtime of runtimeAssets) {
    const resolved = runtime.asset;
    if (resolved.status !== "RESOLVED" || !resolved.binary || !runtime.bytes) continue;
    const bindings = bindingByAsset.get(resolved.assetId) ?? [];
    const transferableBindings = bindings.filter((binding) => binding.renderStrategy === "RASTER_IMAGE" || binding.renderStrategy === "SANITIZED_SVG");
    if (transferableBindings.length === 0) continue;
    const type = mediaType(resolved.mediaType);
    if (!type) continue;
    assets.push({
      assetId: resolved.assetId,
      mediaType: type,
      byteLength: resolved.binary.byteLength,
      sha256: resolved.binary.sha256,
      bytes: runtime.bytes,
      bindingIds: transferableBindings.map((binding) => binding.bindingId)
    });
  }
  if (assets.length === 0) return undefined;
  const session = store.create({ assets, limits });
  return { session: session.descriptor, manifest: session.manifest };
}
