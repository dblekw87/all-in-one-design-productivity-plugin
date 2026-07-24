# Snapshot Normalization

Snapshot Normalization은 DOM Snapshot, Style Snapshot, Geometry Evidence를 하나의 Parser 내부 `NormalizedPageModel`로 결합하는 단계다. Browser 원본 계약은 변경하지 않으며 Figma API나 Design IR 타입을 포함하지 않는다.

세 Snapshot의 `dom_000001` 형식 ID를 `Map`으로 인덱싱한 뒤 DOM Tree를 한 번 순회한다. Element에는 Style Entry와 Geometry Entry를 연결하고 Text에는 원본 text와 parent ID만 연결한다. 누락되거나 불일치하는 Entry는 기본값으로 대체하지 않고 실패한다.

`@aio/page-model`이 `modelVersion: "1.0"` 계약, Zod Schema, semantic validator를 소유한다. Normalized ID는 현재 Snapshot ID를 그대로 사용한다. `document` Design IR 필드는 사용하지 않으며 Analyze 응답의 `normalizedModel` optional field에만 노출한다.

최소 CSS Parser는 `px`, `%`, `em`, `rem`, `vw`, `vh`, `auto`, `none`, `normal`, 주요 keyword와 단순 유한 Number를 처리한다. `rgb()`, `rgba()`, 6/8자리 hex, `transparent`를 Color로 처리한다. `calc()`, CSS Color 4, 복합 문법은 raw 값과 `parsed: false`를 유지한다. 실패값을 0으로 바꾸지 않는다.

Display, Position, Box Model, Typography, Flex/Grid evidence, Geometry, Visibility evidence를 정규화한다. Pseudo style은 부모 Element에 연결하며 일반 Child Node로 만들지 않는다. Parse failure는 Code별 집계와 최대 3개의 sample Node ID로 기록한다.

결과는 Zod Schema와 semantic tree validator를 통과해야 한다. 전체 Text, URL Query, Snapshot Payload를 오류나 로그에 출력하지 않는다.

```text
Safe Navigation
→ DOM Snapshot
→ Style Snapshot
→ Geometry Evidence
→ Normalized Page Model
→ status: NORMALIZED
```

`document`는 비어 있고 `assets`는 빈 배열이며 `designNodeCount`는 0이다. Flex/Grid Layout 알고리즘, gap/padding 추론, absolute 판정, HUG/FILL/FIXED, Layout Confidence, Design IR, Figma Renderer는 다음 단계의 책임이다.

Step 12에서는 이 모델을 입력으로 `Layout Evidence`를 생성한다. Evidence는 축 정렬, gap, padding 비교, overlap, wrapping 후보와 Flex/Grid/Block source를 기록할 뿐 최종 Layout Mode나 Auto Layout을 판정하지 않는다.
