export interface ChromeTab {
  id?: number;
  url?: string;
  title?: string;
  active?: boolean;
}

export interface ChromeMessageSender {
  tab?: ChromeTab;
}

export interface ChromeRuntimeApi {
  onInstalled: { addListener(listener: () => void): void };
  onMessage: {
    addListener(
      listener: (
        message: unknown,
        sender: ChromeMessageSender,
        sendResponse: (response: unknown) => void
      ) => boolean | void
    ): void;
  };
  sendMessage(message: unknown): Promise<unknown>;
  getManifest(): { version: string; manifest_version: number };
}

export interface ChromeTabsApi {
  query(queryInfo: { active?: boolean; currentWindow?: boolean }): Promise<ChromeTab[]>;
  sendMessage(tabId: number, message: unknown): Promise<unknown>;
}

export interface ChromeScriptingApi {
  executeScript(details: { target: { tabId: number }; files: string[] }): Promise<unknown[]>;
}

export interface ChromePermissionsApi {
  contains(permissions: { permissions?: string[]; origins?: string[] }): Promise<boolean>;
}

export interface ChromeApi {
  runtime: ChromeRuntimeApi;
  tabs: ChromeTabsApi;
  scripting: ChromeScriptingApi;
  permissions?: ChromePermissionsApi;
}

declare global {
  const chrome: ChromeApi;
}
