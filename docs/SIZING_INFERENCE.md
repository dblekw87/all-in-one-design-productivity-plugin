# Sizing Inference

## Purpose

Sizing Inference는 Normalized Page Model, Layout Evidence, Layout Inference를 결합해 Element의 가로와 세로 크기 결정 방식에 대한 규칙 기반 Evidence를 만든다. 결과는 Figma API 타입이 아닌 플랫폼 독립 계약이며, Design IR 단계에서 소비된다.

Width와 Height는 독립적으로 추론한다. 한 번의 viewport 측정만으로 반응형 동작을 확정하지 않으며, 현재 측정된 pixel 크기만으로 `FIXED`를 확정하지 않는다.

## Modes

`CONTENT`, `STRETCH`, `FIXED`, `RELATIVE`, `INTRINSIC`, `CONSTRAINED`, `UNKNOWN`을 사용한다. `CONSTRAINED`는 min/max 또는 aspect-ratio가 주요한 제한임을 나타내며 원래의 크기 결정 근거와 함께 해석한다.

각 축은 최대 3개의 Candidate와 score, confidence, source value, parent/content relation을 가진다. score와 confidence는 확률이 아니라 규칙 기반 신뢰도다.

## Sources and Relations

`cssWidth`/`cssHeight`는 Computed Style 값이고, `measuredSize`는 Geometry의 bounding rect 값이다. `clientWidth`, `offsetWidth`, padding, border, `box-sizing`과의 차이를 기록하지만 CSS Layout Engine을 재구현하지 않는다.

Parent Content Box와의 관계, Flow Child Content Bounds와의 관계를 Map 기반으로 계산한다. Positioned Child는 Content Bounds에서 제외한다. Text Node Geometry는 아직 없으므로 text-only sizing은 제한된 confidence와 warning을 가질 수 있다.

Computed Style은 원래 stylesheet 선언의 상대 단위를 잃을 수 있다. 현재는 계산된 값과 inline attribute 등 이미 수집된 값만 사용하며, CSS Cascade/stylesheet source를 재구성하지 않는다.

## Rules

- 명시적 pixel size와 Geometry가 일치하면 `FIXED` 후보를 만든다.
- Block의 `width:auto`가 Parent Content Width와 맞으면 `STRETCH`, `height:auto`는 일반적으로 `CONTENT` 후보를 만든다.
- Flex grow, zero basis, counter-axis stretch는 `STRETCH` 근거다.
- Grid item의 observed track match는 제한적인 `STRETCH` 근거다.
- `%`, `vw`, `vh`, `calc()`, `clamp()`, `min()`, `max()`는 `RELATIVE` 후보를 만든다.
- `img`, `svg`, `video`, `canvas`, `iframe` 등 replaced element는 natural asset dimension을 수집하지 않고 낮은 confidence의 `INTRINSIC` 후보를 만든다.
- min/max와 aspect-ratio는 별도 Constraint/Aspect Ratio evidence로 보존한다.
- absolute/fixed element는 inset 기반 stretch와 measured geometry를 분리하고, 불확실하면 absolute geometry fallback을 기록한다.

`width:auto`는 무조건 `CONTENT`가 아니며, `width:100%`도 부모 Layout 근거 없이 무조건 `STRETCH`가 아니다.

## Validation and Pipeline

결과는 `packages/sizing-inference`의 Zod Schema와 Semantic Validator를 통과한다. Element ID, Layout Inference ID, finite number, candidate 수, confidence 범위와 mode/source 관계를 검증한다.

Analyze Pipeline은 다음 순서다.

```text
DOM → Style → Geometry → Normalized → Layout Evidence → Layout Inference → Sizing Inference
```

Analyze 상태는 `SIZING_INFERRED`이며 `sizingInference` optional field에 결과가 담긴다. `document`는 아직 Design IR 전용으로 비어 있고, `assets`는 빈 배열이며, `designNodeCount`는 0이다.

## Security and Limits

Sizing 결과와 오류 로그에 전체 Tree, Text Content, Geometry 배열, background URL을 출력하지 않는다. Persistent 저장이나 외부 요청은 수행하지 않는다. 현재 Policy는 단일 immutable threshold module에 있으며, 여러 viewport를 비교하는 Responsive Sizing은 이후 단계다.

## Boundary

이번 단계에서는 Figma `HUG`, `FILL`, `FIXED`, Constraints, Auto Layout Property, Text Auto Resize, Asset Dimension Pipeline, Design IR, Renderer를 구현하지 않는다. 다음 단계에서 Sizing 결과를 Design IR의 플랫폼 독립 sizing model로 매핑할 때 별도 변환 정책을 정의한다.
