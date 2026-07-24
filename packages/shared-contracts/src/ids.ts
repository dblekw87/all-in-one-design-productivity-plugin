export type MessageId = `msg_${string}`;
export type OperationId = `op_${string}`;
export type ParserRequestId = `req_${string}`;

export interface IdGenerator {
  nextMessageId(): MessageId;
  nextOperationId(): OperationId;
}

function randomString(): string {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && "randomUUID" in cryptoApi) {
    return cryptoApi.randomUUID().replaceAll("-", "");
  }

  const random = Math.random().toString(36).slice(2);
  return `${Date.now().toString(36)}${random}`;
}

export function createMessageId(): MessageId {
  return `msg_${randomString()}`;
}

export function createOperationId(): OperationId {
  return `op_${randomString()}`;
}

export function createParserRequestId(): ParserRequestId {
  return `req_${randomString()}`;
}

export function createDefaultIdGenerator(): IdGenerator {
  return {
    nextMessageId: createMessageId,
    nextOperationId: createOperationId
  };
}
