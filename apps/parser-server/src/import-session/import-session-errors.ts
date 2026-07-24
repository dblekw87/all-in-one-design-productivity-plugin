import type { ErrorCode } from "@aio/shared-contracts";

export class ImportSessionError extends Error {
  constructor(
    public readonly code: Extract<ErrorCode, `IMPORT_${string}`>,
    message: string,
    public readonly statusCode = 404
  ) {
    super(message);
    this.name = "ImportSessionError";
  }
}
