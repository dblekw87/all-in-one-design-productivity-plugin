# Layout Evidence

Layout Evidence는 `NormalizedPageModel`을 읽기 전용으로 분석해 Layout Inference에 필요한 수치와 관계를 생성한다. Layout Mode, Auto Layout, HUG/FILL/FIXED를 결정하지 않는다.

## Contract

`@aio/layout-evidence`가 `evidenceVersion: "1.0"` 계약과 Zod/semantic validation을 소유한다. Element별 Entry를 생성하며 Text Node는 독립 Entry를 갖지 않는다. Node ID는 Normalized Model의 Snapshot ID를 그대로 사용한다.

## Evidence

- 직속 Element Child를 Flow와 Positioned로 분리한다. `absolute`, `fixed`만 Positioned 후보이며 `relative`, `sticky`는 Flow에 남긴다.
- X/Y 축 순서, monotonicity, projection overlap, alignment ratio와 gap 통계를 기록한다.
- Negative Gap을 보존해 겹침과 구분한다.
- 부모 declared padding과 Geometry 기반 observed padding을 비교하되 CSS Length가 PX일 때만 comparable로 표시한다.
- Child bounds로 content bounds와 width/height variation을 계산한다.
- 형제 overlap pair와 제한된 sample을 기록한다. 100개 초과 Child는 제한 경고를 낸다.
- Row/Column grouping은 wrapping 후보일 뿐 최종 Wrap 판정이 아니다.
- Flex/Grid/Block/Positioned source evidence와 direct Text 혼합 상태를 보존한다.

## Pipeline

```text
DOM → Style → Geometry → Normalized Page Model → Layout Evidence
→ status: LAYOUT_EVIDENCE_BUILT
```

Analyze 응답의 `layoutEvidence`는 현재 Debug 연결을 위해 optional로 포함한다. `document`는 비어 있고 `assets`는 빈 배열이며 `designNodeCount`는 0이다.

Layout Inference 단계는 이 Evidence를 입력으로 Candidate와 Confidence를 계산한다. Evidence 자체는 최종 Layout Mode나 Auto Layout을 판정하지 않는다.

## Boundary

이번 단계는 Layout Inference 정책의 입력만 만든다. HORIZONTAL/VERTICAL/GRID 결정, Auto Layout 매핑, Grid Frame 생성, Sizing 판정, Margin Collapse, Design IR, Figma Renderer는 다음 단계의 책임이다.

## Performance And Privacy

계산은 부모별 직속 Child 기준으로 수행한다. Overlap은 최대 100개 Flow Child만 전체 pair 검사하며 전체 Page의 모든 Node를 비교하지 않는다. 전체 Tree, Text, URL Query, Geometry 배열은 로그에 출력하지 않는다.
