export class DomExtractionError extends Error {
  constructor(
    readonly code: "DOM_EXTRACTION_FAILED" | "DOM_SNAPSHOT_INVALID" | "DOM_SERIALIZATION_FAILED",
    message: string
  ) {
    super(message);
    this.name = "DomExtractionError";
  }
}
