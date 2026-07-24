export class GeometryExtractionError extends Error {
  constructor(readonly code: "GEOMETRY_EXTRACTION_FAILED" | "GEOMETRY_EVIDENCE_INVALID" | "GEOMETRY_SNAPSHOT_MISMATCH" | "SNAPSHOT_PIPELINE_UNSTABLE", message: string) {
    super(message);
    this.name = "GeometryExtractionError";
  }
}
