export type BrowserCaptureErrorCode =
  | "BROWSER_CAPTURE_REQUEST_INVALID"
  | "BROWSER_TAB_NOT_FOUND"
  | "CONTENT_SCRIPT_NOT_CONNECTED"
  | "CAPTURE_ALREADY_RUNNING"
  | "CAPTURE_NODE_LIMIT_EXCEEDED"
  | "CAPTURE_DEPTH_LIMIT_EXCEEDED"
  | "CAPTURE_DURATION_LIMIT_EXCEEDED"
  | "CAPTURE_DOM_FAILED"
  | "CAPTURE_STYLE_FAILED"
  | "CAPTURE_GEOMETRY_FAILED"
  | "CAPTURE_PSEUDO_FAILED"
  | "CAPTURE_SVG_FAILED"
  | "CAPTURE_ASSET_REFERENCE_FAILED"
  | "CAPTURE_SNAPSHOT_INVALID"
  | "CAPTURE_SEMANTIC_INVALID"
  | "CAPTURE_MESSAGE_TOO_LARGE"
  | "CAPTURE_CANCELLED"
  | "SHADOW_ROOT_UNSUPPORTED"
  | "CROSS_ORIGIN_IFRAME_UNSUPPORTED";

export interface BrowserCaptureError {
  code: BrowserCaptureErrorCode;
  message: string;
  retryable: boolean;
}

export interface BrowserCaptureWarning {
  code: BrowserCaptureErrorCode | "INLINE_SVG_UNSAFE" | "ASSET_REFERENCE_UNSUPPORTED" | "CAPTURE_PARTIAL";
  message: string;
  severity: "INFO" | "WARNING" | "ERROR";
  sourceNodeId?: string;
}

export function browserCaptureError(code: BrowserCaptureErrorCode, message: string, retryable = false): BrowserCaptureError {
  return { code, message, retryable };
}
