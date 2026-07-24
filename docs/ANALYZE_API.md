# Analyze API

## Endpoint

```http
POST /v1/imports/analyze
```

This endpoint is the stable Parser Server boundary for Website Import analysis. It validates the request and target, navigates through the Safe Browser Runtime, and returns versioned navigation metadata, DOM Snapshot, Computed Style Snapshot, Geometry Evidence, Normalized Page Model, and optional Layout Evidence. It does not infer layout, collect assets, or build Design IR yet.

## Request Contract

```ts
interface AnalyzeWebsiteRequest {
  contractVersion: "1.0";
  url: string;
  viewport?: {
    width?: number;
    height?: number;
    deviceScaleFactor?: number;
  };
  capture?: {
    mode: "VIEWPORT" | "FIXED_HEIGHT";
    maxHeight?: number;
  };
  options?: {
    excludeHidden?: boolean;
    excludeIframes?: boolean;
    excludeCanvas?: boolean;
    includePseudoElements?: boolean;
  };
}
```

The shared runtime schema normalizes omitted values before the analyze service runs.

## Defaults

```ts
viewport = {
  width: 1440,
  height: 1200,
  deviceScaleFactor: 1
};

capture = {
  mode: "VIEWPORT"
};

options = {
  excludeHidden: true,
  excludeIframes: true,
  excludeCanvas: true,
  includePseudoElements: true
};
```

## Validation

Schema validation checks:

- `contractVersion` is `"1.0"`.
- `url` is present, non-empty, and no longer than 2048 characters.
- viewport width is an integer from 320 to 3840.
- viewport height is an integer from 320 to 5000.
- `deviceScaleFactor` is from 0.5 to 3.
- capture mode is `VIEWPORT` or `FIXED_HEIGHT`.
- `FIXED_HEIGHT` requires `maxHeight` from 320 to 10000.
- unknown fields are rejected.

Request schema validation and target security validation are separate. Malformed requests return `400`. Unsafe targets return `422`.

## Security Validation

The route calls the existing Parser Server target security validator. It preserves the Step 4 HTTPS-only production policy and does not add localhost to any production allowlist.

Unsafe URLs are not passed to the analyze service.

## Response Contract

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
  snapshot?: DomSnapshotDocument;
  styleSnapshot?: StyleSnapshotDocument;
  geometry?: GeometryEvidenceDocument;
  normalizedModel?: NormalizedPageModel;
  layoutEvidence?: LayoutEvidenceDocument;
  layoutInference?: LayoutInferenceDocument;
  sizingInference?: SizingInferenceDocument;
  assetReferences?: AssetReferenceDocument;
  resolvedAssets?: ResolvedAssetDocument;
  document?: unknown;
  assets: AnalyzeAssetReference[];
  warnings: AnalyzeWarning[];
  metrics: AnalyzeMetrics;
}
```

`document` is intentionally `unknown` in shared contracts for now so `shared-contracts` does not depend on `design-ir`. The Parser Server will validate concrete Design IR at the boundary where IR generation is implemented.

## Current Behavior

For a safe target, Step 10 returns HTTP `200` with:

- `status: "GEOMETRY_CAPTURED"`
- `navigation` metadata
- `security` request summary
- `snapshot` rooted at `body`
- `styleSnapshot` entries keyed by DOM Element Snapshot ID
- `geometry` entries keyed by DOM Element Snapshot ID
- no Design IR `document`
- `assets: []`
- `domNodeCount` equal to the Snapshot node count
- zero design and asset counts
- Snapshot warnings such as depth, node, and pseudo-element deferrals
- Style warnings and style metrics
- Geometry metrics and viewport/document coordinates
- `processingTimeMs` measured from the analyze pipeline timing

This is a normal response, not an exception.

## Errors

- `400`: invalid request body, returned as `SerializableError` with `ANALYZE_REQUEST_INVALID`.
- `422`: blocked target, returned as `SerializableError` from the security validator.
- `500`: unexpected server failure.

Error responses must not include stack traces, credentials, cookies, or full query strings.

## Versioning

The request and response both include `contractVersion: "1.0"`. Breaking changes require a new version. Additive fields should be optional.

## Browser Runtime Connection Point

Later steps extend the Browser Analyze Service internals with:

```text
validated request
-> validated target
-> browser runtime
-> DOM Snapshot
-> computed style/bounds extraction
-> Design IR builder
-> versioned analyze response
```

The route contract should remain stable.

## Forbidden Patterns

- Do not fetch external websites in the route handler.
- Do not bypass the Step 4 target validator.
- Do not allow localhost in production security policy for fixture convenience.
- Do not put Playwright setup into the shared contracts package.
- Do not make `shared-contracts` depend on Figma API types.
Design IR is returned in `document` with status `DESIGN_IR_BUILT`. `assetReferences` and `resolvedAssets` remain separate intermediate contracts; `assets` remains empty until a later Plugin Transfer projection.
## Asset Transfer Session

Design IR에서 실제 사용하는 Resolved Asset이 있으면 응답 상태는 `TRANSFER_SESSION_READY`가 되고 `assetTransfer.session`과 `assetTransfer.manifest`가 포함된다. Binary는 응답 JSON에 포함되지 않으며 Plugin은 Manifest의 상대 Path와 Session Token을 사용해 `GET /v1/imports/:sessionId/assets/:assetId`를 호출한다. Asset이 없으면 `DESIGN_IR_BUILT`를 유지한다.
