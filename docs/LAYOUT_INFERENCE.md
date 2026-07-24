# Layout Inference

Layout Inference는 `NormalizedPageModel`과 `LayoutEvidence`를 읽어 규칙 기반으로 Container의 논리적 Layout Mode를 추론한다. 기존 Snapshot과 Evidence를 수정하지 않으며 Figma API 타입이나 Design IR을 사용하지 않는다.

```text
DOM → Style → Geometry → Normalized Model → Layout Evidence → Layout Inference
```

Inference Version은 `1.0`이다. Element마다 최대 3개의 Candidate, Score, Confidence, Reason, Conflict, Fallback을 반환한다. 명시적 Flex/Grid/Block Source를 우선하고 Geometry Evidence로 검증한다.

지원 Mode는 `LEAF`, `FLOW_VERTICAL`, `FLOW_HORIZONTAL`, `FLEX_ROW`, `FLEX_COLUMN`, `FLEX_ROW_WRAP`, `FLEX_COLUMN_WRAP`, `GRID`, `FREEFORM`, `UNKNOWN`이다. Threshold와 penalty는 `DEFAULT_LAYOUT_INFERENCE_THRESHOLDS` 한 곳에서 관리한다. Confidence는 확률이 아니라 규칙 기반 신뢰도다.

Absolute/Fixed Child는 Flow와 분리하며 Positioned Child 하나 때문에 Container 전체를 `FREEFORM`으로 바꾸지 않는다. Hidden Attribute, `display:none`, zero-area Child는 제외 후보로 기록하고 `aria-hidden`만으로 시각 Layout에서 제외하지 않는다. Gap과 Padding은 선언값, 관찰값, 출처와 Confidence를 함께 기록한다.

결과는 Zod Schema와 Semantic Validator를 통과해야 한다. Analyze 상태는 `LAYOUT_INFERRED`이며 `layoutInference` optional 필드에 결과를 담는다. 다음 단계의 Sizing Inference는 이 결과를 입력으로 사용한다. `document`는 비어 있고 `assets`는 빈 배열이며 `designNodeCount`는 0이다.

이번 단계에서는 Figma `layoutMode`, HUG/FILL/FIXED, Constraints, Design IR, Node Rendering, Asset Pipeline을 구현하지 않는다.
