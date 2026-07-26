export interface BrowserCaptureRequest {
  sessionId: string;
  tabId: number;
  captureMode: "BROWSER_TAB";
  options: BrowserCaptureOptions;
}

export interface BrowserCaptureOptions {
  includeHidden: boolean;
  includePseudo: boolean;
  includeInlineSvg: boolean;
  includeAssets: boolean;
  maxNodes: number;
  maxDepth: number;
}
