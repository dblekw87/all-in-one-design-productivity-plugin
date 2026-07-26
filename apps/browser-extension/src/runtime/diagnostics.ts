import type { ExtensionDiagnostics, BrowserTabInfo } from "../contracts/messages.js";
import type { ChromeApi, ChromeTab } from "../shared/chrome-types.js";
import { extensionConfig } from "../shared/config.js";
import type { ExtensionRuntime } from "./extension-runtime.js";

export async function collectDiagnostics(chromeApi: ChromeApi, runtime: ExtensionRuntime): Promise<ExtensionDiagnostics> {
  const manifest = chromeApi.runtime.getManifest();
  const tab = await getCurrentTab(chromeApi);
  return {
    version: manifest.version || extensionConfig.version,
    manifestVersion: 3,
    permissions: {
      activeTab: await hasPermission(chromeApi, "activeTab"),
      tabs: await hasPermission(chromeApi, "tabs"),
      storage: await hasPermission(chromeApi, "storage"),
      scripting: await hasPermission(chromeApi, "scripting")
    },
    ...(tab ? { connectedTab: tab, currentUrl: tab.url } : {}),
    currentMode: extensionConfig.captureMode,
    runtimeStatus: runtime.status(),
    captureSupport: {
      browserTab: extensionConfig.featureFlags.browserTabCapture,
      dom: extensionConfig.featureFlags.domCapture,
      style: extensionConfig.featureFlags.styleCapture,
      geometry: extensionConfig.featureFlags.geometryCapture,
      screenshot: extensionConfig.featureFlags.screenshotCapture
    }
  };
}

export async function getCurrentTab(chromeApi: ChromeApi): Promise<BrowserTabInfo | undefined> {
  const [tab] = await chromeApi.tabs.query({ active: true, currentWindow: true });
  return tabToInfo(tab);
}

export function tabToInfo(tab: ChromeTab | undefined): BrowserTabInfo | undefined {
  if (tab?.id === undefined) return undefined;
  return {
    tabId: tab.id,
    ...(tab.url ? { url: tab.url } : {}),
    ...(tab.title ? { title: tab.title } : {}),
    active: tab.active ?? false
  };
}

async function hasPermission(chromeApi: ChromeApi, permission: string): Promise<boolean> {
  if (!chromeApi.permissions) return true;
  return chromeApi.permissions.contains({ permissions: [permission] });
}
