import type { SerializableError } from "./error.js";

export interface WebsiteTargetInspectionRequest {
  url: string;
}

export type WebsiteTargetInspectionResponse =
  | {
      safe: true;
      normalizedUrl: string;
      hostname: string;
      resolvedAddresses: string[];
    }
  | {
      safe: false;
      error: SerializableError;
    };
