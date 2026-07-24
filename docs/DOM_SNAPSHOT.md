# DOM Snapshot

## Purpose

DOM Snapshot은 Browser DOM과 이후 Style Snapshot, Layout Evidence, Design IR 사이의 사실 데이터 경계다. Figma API 타입, computed style, bounds, layout 추론, HTML 문자열을 포함하지 않는다.

## Contract

`@aio/dom-snapshot`이 `snapshotVersion: "1.0"` 계약과 Zod parser를 소유한다. Document root는 렌더링 대상과 가까운 `body` Element다. `html`과 `head` metadata는 Snapshot tree에 포함하지 않고 URL, final URL, title을 source에 기록한다.

Element와 Text는 `nodeType` discriminated union이다. Snapshot ID는 순회 순서로 `dom_000001` 형식으로 생성되며 Snapshot 내부에서만 의미가 있다. Parent ID와 children을 함께 유지한다.

## Extraction Policy

- `SCRIPT`, `STYLE`, `NOSCRIPT`, `TEMPLATE`, `META`, `LINK`, `BASE`, `TITLE`은 제외한다.
- `IFRAME`과 `CANVAS` Element는 유지하지만 내부 Document 또는 drawing content는 수집하지 않는다.
- Open Shadow Root는 일반 children으로 flatten하지 않고 `SHADOW_ROOT_SKIPPED` warning을 기록한다. Closed Shadow Root는 브라우저 API로 접근할 수 없다.
- `excludeHidden`은 Step 8에서 hidden, `aria-hidden`, `inert` 요소를 제거하지 않고 flags로 보존한다. `display:none` 등 Style 기반 판단은 다음 단계의 책임이다.
- `includePseudoElements`는 옵션을 Snapshot metadata에 보존하고 `PSEUDO_ELEMENT_EXTRACTION_DEFERRED`를 한 번 기록한다.

## Attributes And Text

Allowlist 기반으로 id, class, semantic/ARIA, 일부 data, asset/link 관련 속성을 수집한다. `value`, nonce, integrity, credential-like attribute는 수집하지 않는다. URL 속성의 민감 query 값은 redaction한다. Script text, password input value, form 사용자 입력은 수집하지 않는다.

Text는 원문을 보존하고 whitespace-only 여부를 별도 flag로 기록한다. Formatting whitespace 제거는 수행하지 않는다. 최대 길이를 넘은 Text는 truncate하고 warning을 기록한다.

## Limits And Validation

`PARSER_MAX_DOM_DEPTH`, `PARSER_MAX_DOM_NODES`, `PARSER_MAX_TEXT_NODE_LENGTH`로 depth, node 수, text 길이를 제한한다. 제한에 도달하면 가능한 partial tree를 반환하고 metrics와 warning을 남긴다. Browser `evaluate()` 결과는 Server에서 `parseDomSnapshot()`으로 검증하며 중복 ID와 parent 참조도 검사한다.

## Analyze Response

Navigation 후 Snapshot을 수집하면 Analyze 응답은 `status: "DOM_SNAPSHOTTED"`가 되고 `snapshot`을 포함한다. `domNodeCount`는 Snapshot total count, `designNodeCount`와 `assetCount`는 아직 0이다. `document`는 Design IR 전용 필드로 비워 둔다.

## Privacy Boundary

Snapshot은 외부 대상의 텍스트와 semantic metadata를 포함할 수 있으므로 장기 저장하지 않는다. URL 전체, Cookie, Storage, 전체 HTML, 전체 Error payload를 로그에 남기지 않는다. 이후 Plugin 전송 시에도 Payload 크기와 사용자 동의 정책을 적용해야 한다.

## Next Step Boundary

Style Snapshot은 `@aio/style-snapshot`에서 별도 관리하며 `snapshotId`로 이 계약과 연결된다. Geometry Evidence도 별도 계약으로 관리하고 Element의 viewport/document rect와 box metrics만 보존한다. Layout, Figma mapping, Design IR 생성은 그 이후 단계의 책임이며 이 계약에 미리 넣지 않는다.
