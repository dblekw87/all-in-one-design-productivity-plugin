# Geometry Evidence

## Purpose

Geometry Evidence는 DOM Element의 브라우저 측 사실 좌표와 box metric을 별도 계약으로 보존한다. Layout inference, Auto Layout, HUG/FILL/FIXED, Figma node mapping은 이 단계에서 수행하지 않는다.

## Coordinates

`boundingRect`는 `getBoundingClientRect()`의 viewport 좌표를 그대로 저장한다. `documentRect.x/y`는 각각 `rect.left + scrollX`, `rect.top + scrollY`로 계산한다. 두 값 모두 transform이 반영된 visual bounds일 수 있으며 원본 CSS layout box와 동일하다고 가정하지 않는다.

## Evidence

각 Element에 대해 width/height, client/offset/scroll metrics를 저장한다. `intersectsViewport`와 `fullyInsideViewport`는 현재 viewport 기준 단순 비교로 계산한다. zero-size와 own-box overflow는 flag로만 기록하며 Element를 제거하지 않는다.

Text Node와 pseudo-element의 geometry는 수집하지 않는다. iframe/canvas Element는 DOM/Style과 동일하게 유지하지만 내부 Document나 drawing content는 순회하지 않는다.

## Snapshot Connection

Geometry Extraction은 DOM, Style과 동일한 root, 제외 tag, text ID 소비, depth traversal 규칙을 사용한다. 반환 후 `@aio/geometry-evidence`가 finite number, rect 관계, DOM Element ID, Style Entry ID, version을 cross-validation한다. Entry set이 맞지 않으면 `GEOMETRY_SNAPSHOT_MISMATCH`로 실패한다.

현재 여러 evaluate 호출 사이 DOM 변경 가능성은 남아 있다. 자동 retry나 MutationObserver stability engine은 구현하지 않았으며, 불일치는 감지 후 실패시키는 정책이다.

## Capture And Limits

Geometry는 Browser Context viewport와 현재 scroll 상태 기준이다. Full-page stitching이나 scroll traversal은 하지 않는다. `PARSER_MAX_GEOMETRY_ENTRIES`로 방어적 Entry 제한을 둔다.

## Analyze Response

응답 상태는 `GEOMETRY_CAPTURED`이며 기존 `snapshot`, `styleSnapshot`과 `geometry`를 함께 반환한다. Design IR `document`는 비어 있고 assets는 빈 배열, designNodeCount는 0이다.

## Security And Privacy

Geometry는 텍스트와 input value를 포함하지 않지만 페이지 전체 크기와 offscreen 위치를 노출할 수 있다. 전체 Geometry payload를 로그나 persistent storage에 기록하지 않는다.

## Next Boundary

다음 단계에서 Style과 Geometry를 결합해 layout evidence를 정규화하고, 그 이후에만 Flex/Grid 및 Figma Auto Layout 변환을 검토한다.
