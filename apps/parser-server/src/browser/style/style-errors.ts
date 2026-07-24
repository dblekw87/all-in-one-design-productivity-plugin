export class StyleExtractionError extends Error {
  constructor(readonly code: "STYLE_EXTRACTION_FAILED" | "STYLE_SNAPSHOT_INVALID" | "STYLE_SNAPSHOT_MISMATCH", message: string) {
    super(message);
    this.name = "StyleExtractionError";
  }
}
