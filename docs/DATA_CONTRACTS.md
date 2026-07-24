# Data Contracts

## Capability Metadata

```ts
type CapabilityCategory =
  | "IMPORT"
  | "REPLACE"
  | "WRITING"
  | "INSPECT"
  | "GENERATE"
  | "SETTINGS";

interface CapabilityMetadata {
  id: string;
  category: CapabilityCategory;
  label: string;
  description: string;
  icon?: string;
  order: number;
  enabled: boolean;
  experimental?: boolean;
  supportsPreview?: boolean;
  supportsCancel?: boolean;
  supportsRestore?: boolean;
}
```

## Capability Contract

```ts
interface PluginCapability<TInput, TPreview, TResult extends CapabilityResult> {
  metadata: CapabilityMetadata;
  inputSchema: ZodType<TInput>;
  validate(context: CapabilityContext, input: TInput): Promise<ValidationResult>;
  preview(context: CapabilityContext, input: TInput): Promise<TPreview>;
  execute(context: CapabilityContext, input: TInput): Promise<TResult>;
  restore?(context: CapabilityContext, historyId: string): Promise<CapabilityResult>;
}
```

## Capability Result

```ts
interface CapabilityResult {
  capabilityId: string;
  operationId: string;
  success: boolean;
  processedCount: number;
  createdCount: number;
  changedCount: number;
  skippedCount: number;
  failedCount: number;
  warnings: CapabilityWarning[];
  failures: CapabilityFailure[];
  startedAt: string;
  completedAt: string;
  details?: unknown;
}
```

## Progress Event

```ts
interface CapabilityProgressEvent {
  operationId: string;
  capabilityId: string;
  phase: string;
  message?: string;
  completedUnits?: number;
  totalUnits?: number;
  warnings?: CapabilityWarning[];
}
```

## Error And Warning Contracts

```ts
interface CapabilityWarning {
  code: string;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  nodeId?: string;
  sourceSelector?: string;
  recoverable: boolean;
}

interface CapabilityFailure {
  code: string;
  message: string;
  nodeId?: string;
  sourceSelector?: string;
  cause?: string;
}
```

## Message Bus Requests

```ts
interface MessageEnvelope<TType extends string, TPayload> {
  protocolVersion: "1.0";
  messageId: string;
  correlationId?: string;
  type: TType;
  timestamp: string;
  payload: TPayload;
}

type PluginRequest =
  | PluginInitializeRequest
  | CapabilityListRequest
  | SelectionScanRequest
  | CapabilityRunRequest
  | CapabilityCancelRequest;
```

## Message Bus Responses

```ts
type PluginResponse =
  | PluginInitializeResponse
  | CapabilityListResponse
  | SelectionScanResponse
  | CapabilityRunResponse
  | CapabilityCancelResponse
  | PluginErrorResponse;

type PluginEvent =
  | PluginReadyEvent
  | SelectionChangedEvent
  | CapabilityProgressEvent
  | CapabilityCompleteEvent;
```

Responses set `correlationId` to the original request `messageId`. Events may omit `correlationId`.

## Website Import Input

```ts
interface WebsiteImportInput {
  url: string;
  viewport: {
    preset: "DESKTOP" | "TABLET" | "MOBILE";
    width: number;
    height: number;
  };
  maxCaptureHeight?: number;
  options: {
    includeImages: boolean;
    includeBackgroundImages: boolean;
    excludeHidden: boolean;
    maxNodeCount: number;
    maxDepth: number;
  };
}
```

The Website Import URL must be a syntactically valid HTTPS URL. Parser Server performs the authoritative security validation before any browser navigation.

## Website Target Inspection

```ts
interface WebsiteTargetInspectionRequest {
  url: string;
}

type WebsiteTargetInspectionResponse =
  | {
      safe: true;
      normalizedUrl: string;
      hostname: string;
      resolvedAddresses: string[];
    }
  | {
      safe: false;
      error: SerializableError;
    };
```

This contract is shared between Plugin and Parser Server for development inspection and future import preflight use. It contains only JSON-serializable data and no Node.js DNS or URL runtime objects.

## Website Analyze Request

```ts
interface AnalyzeWebsiteRequest {
  contractVersion: "1.0";
  url: string;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
  capture: {
    mode: "VIEWPORT" | "FIXED_HEIGHT";
    maxHeight?: number;
  };
  options: {
    excludeHidden: boolean;
    excludeIframes: boolean;
    excludeCanvas: boolean;
    includePseudoElements: boolean;
  };
}
```

Omitted viewport, capture, and option fields are normalized by the Parser Server schema before the analyze service runs.

## Website Analyze Response

```ts
interface AnalyzeWebsiteResponse {
  contractVersion: "1.0";
  requestId: `req_${string}`;
  status: "NOT_IMPLEMENTED" | "BROWSER_NAVIGATED" | "DOM_SNAPSHOTTED" | "STYLE_SNAPSHOTTED" | "GEOMETRY_CAPTURED" | "NORMALIZED" | "LAYOUT_EVIDENCE_BUILT" | "LAYOUT_INFERRED" | "SIZING_INFERRED" | "ASSET_REFERENCES_EXTRACTED" | "ASSETS_RESOLVED" | "ANALYZED";
  target: {
    normalizedUrl: string;
  };
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
  navigation?: {
    requestedUrl: string;
    finalUrl: string;
    statusCode: number | null;
    title: string;
    contentType: string | null;
  };
  security?: {
    totalRequests: number;
    allowedRequests: number;
    blockedRequests: number;
    redirectCount: number;
    blockedByCode: Record<string, number>;
    warnings: AnalyzeWarning[];
  };
  document?: unknown;
  snapshot?: unknown;
  styleSnapshot?: unknown;
  geometry?: unknown;
  normalizedModel?: unknown;
  layoutEvidence?: unknown;
  layoutInference?: unknown;
  sizingInference?: unknown;
  assetReferences?: unknown;
  resolvedAssets?: unknown;
  assets: AnalyzeAssetReference[];
  warnings: AnalyzeWarning[];
  metrics: AnalyzeMetrics;
}
```

`document` remains `unknown` in shared contracts to avoid making `shared-contracts` depend on `design-ir`. The concrete IR is validated where IR generation is implemented.

## Website Import Preview

```ts
interface WebsiteImportPreview {
  finalUrl: string;
  title?: string;
  estimatedNodeCount: number;
  assetCount: number;
  fontFamilies: string[];
  unsupportedStyleCount: number;
  warnings: CapabilityWarning[];
}
```

## Design IR

```ts
interface DesignIRDocument {
  irVersion: "1.0";
  source: {
    requestedUrl: string;
    finalUrl: string;
    capturedAt: string;
    viewport: { width: number; height: number };
  };
  root: DesignNode;
  styles?: Record<string, DesignStyle>;
  assets?: Record<string, DesignAsset>;
  warnings: CapabilityWarning[];
}
```

`DesignNode` is serializable and must not use Figma API types. Large binary assets should be referenced by asset IDs or URLs with signed retrieval, not embedded by default.

```ts
type LayoutMode = "NONE" | "HORIZONTAL" | "VERTICAL" | "GRID";

type DesignNodeType =
  | "DOCUMENT"
  | "FRAME"
  | "TEXT"
  | "IMAGE"
  | "RECTANGLE"
  | "VECTOR"
  | "SVG"
  | "COMPONENT_CANDIDATE"
  | "RASTER_FALLBACK";

interface DesignNode {
  id: string;
  parentId?: string;
  type: DesignNodeType;
  name: string;
  bounds: DesignBounds;
  layout: DesignLayout;
  style: DesignStyleRef | DesignStyle;
  typography?: DesignTypography;
  assetRef?: string;
  metadata: DesignNodeMetadata;
  children: DesignNode[];
}

interface DesignBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DesignLayout {
  mode: LayoutMode;
  positionType: "FLOW" | "ABSOLUTE";
  confidence: number;
  gap?: number;
  rowGap?: number;
  columnGap?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  primaryAxisAlign?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlign?: "MIN" | "CENTER" | "MAX" | "BASELINE";
  wrap?: boolean;
  grow?: number;
  sizingHorizontal?: "FIXED" | "HUG" | "FILL";
  sizingVertical?: "FIXED" | "HUG" | "FILL";
  constraints?: {
    horizontal?: "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE";
    vertical?: "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE";
  };
}

interface DesignStyleRef {
  styleId: string;
}

interface DesignStyle {
  fills?: DesignPaint[];
  strokes?: DesignStroke[];
  borderRadius?: number | [number, number, number, number];
  opacity?: number;
  effects?: DesignEffect[];
  rotation?: number;
  overflowHidden?: boolean;
  blendMode?: string;
}

interface DesignTypography {
  text: string;
  segments: TypographySegment[];
  defaultFontFamily?: string;
  defaultFontStyle?: string;
  fontSize?: number;
  lineHeight?: number | { unit: "PIXELS" | "PERCENT"; value: number };
  letterSpacing?: number;
  textAlignHorizontal?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  textAlignVertical?: "TOP" | "CENTER" | "BOTTOM";
  textAutoResize?: "NONE" | "WIDTH_AND_HEIGHT" | "HEIGHT";
  color?: string;
}

interface TypographySegment {
  start: number;
  end: number;
  fontFamily?: string;
  fontStyle?: string;
  fontWeight?: number;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;
  textDecoration?: "NONE" | "UNDERLINE" | "STRIKETHROUGH";
}

interface DesignNodeMetadata {
  tagName?: string;
  classNames?: string[];
  role?: string;
  ariaLabel?: string;
  sourceSelector?: string;
  sourceUrl?: string;
  semanticType?: string;
  componentCandidateKey?: string;
  unsupportedStyles?: UnsupportedStyle[];
  warnings?: string[];
  rasterFallbackReason?: string;
}

interface UnsupportedStyle {
  property: string;
  value: string;
  strategy:
    | "APPROXIMATE"
    | "VECTORIZE"
    | "RASTERIZE_ELEMENT"
    | "OMIT_WITH_WARNING"
    | "PLACEHOLDER"
    | "SCREENSHOT_REGION";
  reason: string;
}
```

IR versioning rules:

- Every payload includes `irVersion`.
- Minor-compatible additions must be optional.
- Breaking changes require a new parser response version and renderer migration.
- Snapshot tests should pin fixture IR by version.

Style deduplication:

- Common styles may be stored in `styles` and referenced by `styleId`.
- Inline style objects remain allowed for simple MVP output.
- Renderer resolves both forms through one style resolver.

## Asset Contract

```ts
interface DesignAsset {
  id: string;
  type: "IMAGE" | "SVG" | "RASTER_FALLBACK";
  mimeType: string;
  sourceUrl?: string;
  contentHash?: string;
  width?: number;
  height?: number;
  bytesBase64?: string;
  retrievalUrl?: string;
  sanitized: boolean;
}
```

## History Contract

```ts
interface HistoryRecord {
  historyId: string;
  capabilityId: string;
  operationId: string;
  label: string;
  createdNodeIds: string[];
  changedNodeIds: string[];
  beforeStateRefs?: string[];
  afterStateRefs?: string[];
  restorable: boolean;
  createdAt: string;
  expiresAt?: string;
}
```

## Settings Contract

```ts
interface PluginSettings {
  version: number;
  websiteImport: {
    parserServerUrl: string;
    defaultViewport: "DESKTOP" | "TABLET" | "MOBILE";
    defaultMaxCaptureHeight: number;
  };
  fontMapping: FontMappingRule[];
}
```
The `document` field is concretely a Design IR 1.0 document after status `DESIGN_IR_BUILT`. It contains no Figma API objects, binary buffers, Base64, or raw SVG.
