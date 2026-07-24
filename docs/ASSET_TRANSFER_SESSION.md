# Asset Transfer Session

## 목적

Asset Resolution에서 검증된 Binary를 Analyze JSON에 Base64로 넣지 않고, 요청 단위 In-Memory Session을 통해 Figma Plugin이 가져오도록 한다.

흐름은 다음과 같다.

```text
Analyze -> Asset Resolution -> Design IR -> Import Session -> Manifest -> Asset GET
```

## Contract

Shared Contract에는 `ImportSessionDescriptor`, `AssetTransferManifest`, `AssetTransferEntry`만 포함한다. `Uint8Array`, Buffer, Raw SVG, Token Hash는 Shared Contract에 포함하지 않는다.

Manifest Entry는 Asset ID, Design IR Binding ID, MIME, Byte Length, SHA-256, Transfer Type, 상대 Download Path와 만료 시각을 가진다.

## Session과 Token

Session ID는 `crypto.randomUUID()` 기반의 `imp_` 식별자다. Access Token은 256bit 이상의 `crypto.randomBytes()`로 만들며 URL Query에 넣지 않고 `Authorization: Bearer` Header로만 전달한다.

Store에는 Token 원문이 아니라 SHA-256 Hash만 보관하고 timing-safe 비교를 사용한다. Token은 계정 인증 Token이 아니며 해당 Session과 TTL 안에서만 유효하다.

## Store와 TTL

Parser Server는 `ImportSessionStore` 인터페이스와 `InMemoryImportSessionStore` 구현을 분리한다. 기본 TTL은 5분이며 조회가 TTL을 연장하지 않는다.

Lazy Cleanup과 주기적 Cleanup을 모두 사용하고, `close()`에서 Timer와 Binary Reference를 제거한다. Session 수, Asset 수, Session Byte, 전역 Byte, Session Download Count 제한을 적용한다. Limit 초과 시 새 Session을 만들지 않는다.

## API

```http
POST /v1/imports/analyze
GET /v1/imports/:sessionId/assets/:assetId
Authorization: Bearer <session-token>
DELETE /v1/imports/:sessionId
Authorization: Bearer <session-token>
```

Transfer 가능한 Asset이 있을 때 Analyze 상태는 `TRANSFER_SESSION_READY`가 되며 `assetTransfer`에 Descriptor와 Manifest가 들어간다. Transfer Asset이 없으면 `DESIGN_IR_BUILT`를 유지한다.

잘못된 Session, Token, Asset은 외부에서 Asset Not Found 형태로 통합해 Session 존재 여부를 과도하게 노출하지 않는다. Delete는 Idempotent 204 정책을 사용한다.

## Asset 등록

성공한 Resolved Asset 중 Design IR Binding이 실제로 사용하고 `RASTER_IMAGE` 또는 `SANITIZED_SVG` 전략을 가진 Asset만 등록한다. 실패, 차단, Placeholder-only, Raw SVG, 미사용 Asset은 등록하지 않는다.

Runtime Binary는 Resolution 결과에서 Session Store로 소유권을 이전한다. Analyze JSON에는 Binary나 Base64를 넣지 않는다. Session 삭제와 만료 시 Buffer Reference를 제거한다.

## 응답 Header

Asset 응답은 검증된 MIME과 Byte Length를 사용한다.

```text
Cache-Control: private, no-store
Pragma: no-cache
X-Content-Type-Options: nosniff
Content-Length: <verified length>
Content-Type: <verified media type>
```

SVG에는 `Content-Security-Policy: default-src 'none'; sandbox`를 적용한다. Range Request와 Cookie 인증은 지원하지 않는다.

## SVG와 CORS

SVG Transfer는 Step 16에서 XML 검사와 위험 요소 차단을 통과한 UTF-8 Bytes만 대상으로 한다. SVG to Vector 변환은 하지 않는다. Raw Unsanitized SVG를 Store에 등록하지 않는다.

Cookie와 Authorization을 외부 Asset Fetch에 전달하지 않는다. 운영 CORS는 명시적 Plugin/API Origin Allowlist를 사용하며 `*`와 Credential 기반 CORS를 기본값으로 사용하지 않는다.

## Validation과 로그

Descriptor와 Manifest는 Zod Runtime Validation을 통과한다. Asset/Binding ID, SHA-256, Byte Length, MIME, 만료 시각과 Metrics 정합성을 검증한다.

Token, Token Hash, Binary, Base64, Raw SVG, 전체 Manifest와 전체 Download URL은 로그에 출력하지 않는다. 로그에는 마스킹된 Session ID, Asset ID, MIME, Byte Count, 상태와 Error Code만 허용한다.

## 경계

이번 단계에서는 Figma Node, Image Paint, SVG Vector, Persistent Store, Redis, S3, CDN, Signed URL, Renderer를 구현하지 않는다. 후속 Figma Plugin Asset Consumer가 Manifest를 읽고 Binary를 소비한다.
# Renderer Consumption Boundary

The Plugin Asset Client consumes session-scoped raster entries through the configured Parser origin. It validates headers, byte length, and SHA-256 before creating Image Paints. Tokens remain in memory and are never exposed in URLs, Design IR, or capability results. SVG entries continue through the placeholder path.
