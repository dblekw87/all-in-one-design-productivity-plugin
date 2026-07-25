export type TextErrorCode =
  | "TEXT_INPUT_INVALID"
  | "TEXT_LENGTH_LIMIT_EXCEEDED"
  | "FONT_LIST_FAILED"
  | "FONT_RESOLUTION_FAILED"
  | "FONT_NOT_AVAILABLE"
  | "FONT_LOAD_FAILED"
  | "FONT_FALLBACK_USED"
  | "TEXT_NODE_CREATE_FAILED"
  | "TEXT_CHARACTERS_APPLY_FAILED"
  | "TEXT_FONT_SIZE_INVALID"
  | "TEXT_LINE_HEIGHT_INVALID"
  | "TEXT_LETTER_SPACING_INVALID"
  | "TEXT_COLOR_INVALID"
  | "TEXT_ALIGNMENT_INVALID"
  | "TEXT_GEOMETRY_APPLY_FAILED"
  | "TEXT_PARENT_APPEND_FAILED"
  | "TEXT_PLACEHOLDER_CREATED"
  | "TEXT_RENDER_CANCELLED";

export class TextRenderError extends Error {
  constructor(public readonly code: TextErrorCode, message: string, public readonly irNodeId?: string) {
    super(message);
    this.name = "TextRenderError";
  }
}
