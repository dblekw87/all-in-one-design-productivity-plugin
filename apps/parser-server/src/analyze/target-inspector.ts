import type { SerializableError } from "@aio/shared-contracts";
import type { ValidatedTarget } from "../security/inspect-target.js";

export interface TargetInspector {
  inspect(url: string): Promise<ValidatedTarget | { error: SerializableError }>;
}
