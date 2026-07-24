export interface LayoutInferenceThresholds {
  strongAxisAlignmentRatio: number;
  moderateAxisAlignmentRatio: number;
  consistentGapCoefficient: number;
  moderateGapCoefficient: number;
  highOverlapRatio: number;
  moderateOverlapRatio: number;
  sourceGeometryConflictPenalty: number;
  positionedChildRatioPenalty: number;
  minimumChildrenForFlowInference: number;
  minimumChildrenForGridInference: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  minimumCandidateScore: number;
  candidateAmbiguityDelta: number;
  paddingTolerancePx: number;
  maxGeometryFlowConfidence: number;
}

export const DEFAULT_LAYOUT_INFERENCE_THRESHOLDS: Readonly<LayoutInferenceThresholds> = Object.freeze({
  strongAxisAlignmentRatio: 0.8,
  moderateAxisAlignmentRatio: 0.55,
  consistentGapCoefficient: 0.2,
  moderateGapCoefficient: 0.45,
  highOverlapRatio: 0.35,
  moderateOverlapRatio: 0.1,
  sourceGeometryConflictPenalty: 0.2,
  positionedChildRatioPenalty: 0.25,
  minimumChildrenForFlowInference: 2,
  minimumChildrenForGridInference: 2,
  highConfidence: 0.8,
  mediumConfidence: 0.55,
  lowConfidence: 0.3,
  minimumCandidateScore: 0.35,
  candidateAmbiguityDelta: 0.08,
  paddingTolerancePx: 4,
  maxGeometryFlowConfidence: 0.85
});
