export type CaptureMode =
  | "PUBLIC_URL"
  | "BROWSER_TAB"
  | "LOCAL_HTML"
  | "LOCAL_ZIP"
  | "LOCALHOST"
  | "SNAPSHOT"
  | "UNKNOWN";

export interface CaptureSource {
  mode: CaptureMode;
  inputUrl?: string;
  normalizedUrl?: string;
  providerId?: string;
  trustedLocalInput?: boolean;
}

export interface CaptureCapabilities {
  mode: CaptureMode;
  providerId: string;
  label: string;
  supportsRemoteNavigation: boolean;
  supportsLocalPayload: boolean;
  implemented: boolean;
}
