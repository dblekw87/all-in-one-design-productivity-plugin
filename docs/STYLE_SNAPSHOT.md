# Computed Style Snapshot

## Purpose

Computed Style Snapshot은 DOM Snapshot의 Element ID에 브라우저 최종 CSS 값을 연결하는 사실 데이터 계층이다. DOM 구조, geometry, layout inference, Figma 타입, Design IR은 포함하지 않는다.

## Contract

`@aio/style-snapshot`이 `styleSnapshotVersion: "1.0"`, allowlist property mapping, Zod schema, cross-snapshot validation을 소유한다. Style Entry는 Element `snapshotId`만 참조하며 Text Node에는 Entry를 만들지 않는다.

DOM Snapshot과 Style Snapshot은 별도 evaluate에서 생성하지만 동일한 `body` root, 제외 tag, iframe/canvas subtree, depth 및 deterministic traversal 규칙을 사용한다. 따라서 DOM Snapshot ID를 재현할 수 있다. 동적 DOM 안정화는 이후 별도 단계의 책임이다.

## Allowlist And Values

`STYLE_PROPERTY_MAP`이 camelCase contract key와 CSS kebab-case property의 단일 소스다. display/visibility, box model, flex, grid, background, border, effects, typography, replaced element, transform 값을 포함한다. Sizing Inference를 위해 `width`, `height`, `top`, `right`, `bottom`, `left`도 optional Style Entry 값으로 수집한다. 이 값은 Geometry의 bounding rect와 다르며 bounds, client rect 자체를 의미하지 않는다.

Computed values는 대부분 문자열 원문으로 보존한다. `none`, `normal`, `auto`, `%`, `calc()`, matrix, gradient, 다중 shadow를 이 단계에서 의미 변환하지 않는다. Style deduplication과 Figma paint/text 변환은 이후 단계다.

## Visibility And Layout Signals

display, visibility, opacity, content-visibility, overflow를 사실 데이터로 기록한다. flex/grid의 존재를 metrics로 집계하지만 Auto Layout, track AST, HUG/FILL/FIXED, layout confidence는 판정하지 않는다.

## Pseudo Elements

`includePseudoElements`가 활성화되면 `::before`와 `::after`의 computed `content`와 allowlist style을 부모 Entry에 연결한다. Pseudo는 DOM Snapshot Node나 별도 ID가 되지 않는다. content가 `none`, `normal`, 또는 display none이면 생성하지 않는다.

## Validation And Limits

Browser evaluate 결과는 `parseStyleSnapshot()`으로 검증한 뒤 DOM Element ID를 대상으로 cross-snapshot validation을 수행한다. 중복 Entry, 잘못된 ID, DOM/Style version 불일치는 거부한다. `PARSER_MAX_STYLE_ENTRIES`와 `PARSER_MAX_STYLE_WARNINGS`로 payload와 warning 수를 제한한다.

## Privacy

`background-image`, `content`, `font-family` 값에 민감 정보가 포함될 수 있으므로 전체 Style Snapshot과 URL을 로그에 출력하지 않는다. CSS Rule Source, stylesheet text, CSS variable 정의는 수집하지 않는다.

## Analyze Response

현재 Analyze 응답은 `status: "STYLE_SNAPSHOTTED"`, `snapshot`, `styleSnapshot`을 반환한다. `assets`는 비어 있고 `designNodeCount`는 0이다. `document`는 여전히 Design IR 전용이다.

## Next Boundary

Geometry Evidence는 `@aio/geometry-evidence`에서 별도 관리하며 `snapshotId`로 Element Style Entry와 연결된다. `getBoundingClientRect()`, viewport/document 좌표, 실제 measured width/height는 Geometry 계약에 저장한다. Sizing Inference는 두 값을 함께 비교하지만 CSS Layout Engine을 재구현하지 않는다. 이후에만 style과 geometry를 normalization하고 Design IR로 변환한다.
