import type { OperationId } from "@aio/shared-contracts";

export interface RunningOperation {
  operationId: OperationId;
  capabilityId: string;
  controller: AbortController;
  startedAt: string;
}

export interface OperationRegistry {
  register(operation: RunningOperation): void;
  get(operationId: OperationId): RunningOperation | undefined;
  cancel(operationId: OperationId): boolean;
  complete(operationId: OperationId): void;
  list(): RunningOperation[];
}

export function createOperationRegistry(): OperationRegistry {
  const operations = new Map<OperationId, RunningOperation>();

  return {
    register(operation) {
      if (operations.has(operation.operationId)) {
        throw new Error(`Operation already registered: ${operation.operationId}`);
      }

      operations.set(operation.operationId, operation);
    },
    get(operationId) {
      return operations.get(operationId);
    },
    cancel(operationId) {
      const operation = operations.get(operationId);
      if (!operation) {
        return false;
      }

      operation.controller.abort();
      return true;
    },
    complete(operationId) {
      operations.delete(operationId);
    },
    list() {
      return [...operations.values()];
    }
  };
}
