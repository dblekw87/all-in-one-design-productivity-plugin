# Asset Reference

## Purpose

Asset Reference는 DOM/Style/Normalized Model에서 시각 Asset의 참조와 사용 관계만 추출한다. Binary, Response Body, Figma Paint, Vector Node와 분리된 버전 계약이다.

## Contract

`@aio/asset-reference`가 `AssetReferenceDocument`를 소유한다. `assets`는 deduplicated definition이고 `usages`는 Element 또는 pseudo-element의 사용 관계다. Asset ID와 Usage ID는 문서 내부 deterministic ID다.

주요 Source는 `IMAGE_ELEMENT`, `PICTURE_SOURCE`, `INLINE_SVG`, `EXTERNAL_SVG`, `BACKGROUND_IMAGE`, `PSEUDO_BACKGROUND_IMAGE`, `DATA_URL`이다. Media type은 URL 확장자나 Data MIME 기반 `Hint`일 뿐 실제 MIME 검증이 아니다.

## Extraction Rules

- IMG는 `src`와 선택적으로 `currentSrc`를 Primary Source로 사용한다.
- `srcset`은 모든 후보를 다운로드하지 않고 대표 후보 Usage만 만든다.
- Inline SVG는 Node Usage와 Metadata Reference만 만들며 Markup을 저장하지 않는다.
- CSS `background-image`의 `url()`만 추출하고 gradient는 Asset으로 만들지 않는다.
- Pseudo background는 부모 Node에 Usage를 연결하며 pseudo Geometry는 없다.
- 상대 URL은 최종 Navigation URL 기준으로 해석한다.

## Security

HTTPS URL은 기존 URL Security Validator를 재사용한다. HTTP, Credential, localhost/private IP, DNS 실패 및 허용하지 않은 Scheme은 차단된다. Data URL은 이미지 MIME과 길이 제한을 통과해야 하며 Decode하지 않는다. Blob URL은 Unsupported다.

Resolved URL과 외부 표시용 Sanitized URL을 구분한다. Query, Credential, Data Payload, Inline SVG Markup은 Log에 출력하지 않는다.

## Deduplication and Limits

동일한 안전한 Resolution Key는 하나의 Asset Definition으로 통합하고 여러 Usage를 연결한다. Asset/Usage/Warning limit 초과는 Partial Document와 집계 Warning으로 처리한다. Usage가 존재하지 않는 Asset을 참조하지 않도록 Semantic Validation을 수행한다.

## Pipeline Boundary

```text
DOM + Style + Normalized Model → Asset Reference → Binary Resolution → Design IR
```

이번 단계에서는 다운로드, MIME 실제 검증, Content Sniffing, Image Decode, SVG Sanitization, Figma 변환을 수행하지 않는다. 다음 단계의 Asset Resolution은 이 문서를 입력으로 사용한다. Analyze 상태는 `ASSET_REFERENCES_EXTRACTED`이며 `assetReferences`에 결과를 넣고, 기존 `assets`는 빈 배열로 유지한다.
