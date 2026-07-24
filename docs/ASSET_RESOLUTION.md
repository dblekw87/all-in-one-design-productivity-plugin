# Asset Resolution

## Purpose

Asset Resolution은 Step 15의 Asset Reference 중 지원 가능한 항목을 가져와 제한된 Binary 검사 결과를 만든다. Reference와 Binary는 별도 계약이며, Binary 자체는 Analyze JSON이나 Shared Contract에 포함하지 않는다.

## Fetch Security

각 Asset은 Fetch 직전에 기존 URL Security Validator로 다시 검사한다. 수동 redirect(`redirect: manual`)를 사용하고 각 Hop마다 HTTPS, Credential, Hostname, DNS/IP 정책을 적용한다. HTTP downgrade, private/loopback/link-local/metadata 주소, redirect loop와 limit 초과를 차단한다.

GET만 사용하며 Cookie, Authorization, Referer, Browser Session Header를 전달하지 않는다. Application 검사는 Infrastructure Egress 방어를 대체하지 않는다.

## Limits

기본 정책은 Asset 5MB, 요청 전체 20MB, 동시 Fetch 4개, Asset redirect 5회, 개별 timeout 10초다. Content-Length를 먼저 검사하지만 Header를 신뢰하지 않고 Streaming Body에도 동일한 Byte Limit을 적용한다. Analyze AbortSignal은 개별 Fetch와 Body Reader에 전달된다.

## Binary Inspection

허용 MIME은 PNG, JPEG, WebP, GIF, AVIF, SVG다. Content-Type, Reference Hint, 실제 Signature를 비교하며 URL 확장자나 Header만 신뢰하지 않는다. PNG/JPEG/GIF/WebP의 기본 Dimension을 추출하고 pixel/width/height limit을 적용한다. AVIF Dimension은 모를 수 있다.

각 Resolved Binary에는 SHA-256과 byteLength가 기록된다. URL 기반 Reference Deduplication과 Binary Hash Deduplication은 별도 개념이다.

## Data URL and SVG

Data URL은 허용 이미지 MIME, 길이, Decode, Signature 검사를 통과해야 한다. Payload는 로그에 남기지 않는다.

SVG는 XML parser로 Root와 구조를 확인한다. DOCTYPE/Entity, script, event handler, foreignObject, 외부 Resource, javascript URL은 차단한다. SVG Sanitization 결과는 Parser 내부에서만 사용하며 Figma Vector 변환은 이후 단계다.

## Partial Success

개별 Asset 실패는 `BLOCKED_SECURITY_POLICY`, `FETCH_TIMEOUT`, `SIGNATURE_INVALID`, `MIME_MISMATCH`, `SVG_SANITIZATION_FAILED` 등 상태로 보존하고 다른 Asset 처리를 계속한다. Config/Contract/전체 Abort 같은 치명적 오류만 전체 Resolution을 중단한다.

## Pipeline

```text
Asset Reference → Secure Fetch → Size/MIME/Signature → Hash/Metadata → Resolved Asset → Design IR
```

Analyze 상태는 `ASSETS_RESOLVED`이며 `resolvedAssets`에는 Metadata만 반환한다. 기존 `assets`는 아직 빈 배열이고 `document`는 Design IR 전용으로 비어 있다.

이번 단계에서는 Figma Image Paint, Vector Node, Image Decode/Compression, Persistent Cache, Screenshot, Design IR을 구현하지 않는다.
## Transfer 경계

Resolution Runtime은 검증된 Bytes를 Parser 내부 결과로만 유지한다. 이후 Step 18 Import Session이 실제 Design IR Binding이 사용하는 성공 Asset만 짧은 TTL Session에 등록한다. Analyze JSON에는 Binary를 넣지 않는다.
