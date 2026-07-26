import type { CaptureMode } from "@aio/shared-contracts";

export interface ExtensionConfig {
  version: string;
  development: boolean;
  captureMode: "BROWSER_TAB";
  supportedModes: CaptureMode[];
  featureFlags: {
    browserTabCapture: boolean;
    domCapture: boolean;
    styleCapture: boolean;
    geometryCapture: boolean;
    screenshotCapture: boolean;
    parserUpload: boolean;
  };
}

export const extensionConfig: ExtensionConfig = {
  version: "0.1.0",
  development: true,
  captureMode: "BROWSER_TAB",
  supportedModes: ["BROWSER_TAB"],
  featureFlags: {
    browserTabCapture: true,
    domCapture: false,
    styleCapture: false,
    geometryCapture: false,
    screenshotCapture: false,
    parserUpload: false
  }
};
