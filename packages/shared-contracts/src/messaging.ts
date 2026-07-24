import type { CapabilityMetadata } from "./capability.js";
import type { SerializableError } from "./error.js";
import type { MessageId, OperationId } from "./ids.js";
import type { CapabilityResult } from "./result.js";
import type { SelectionSummary } from "./selection.js";

export const MESSAGE_PROTOCOL_VERSION = "1.0" as const;

export interface MessageEnvelope<TType extends string, TPayload> {
  protocolVersion: typeof MESSAGE_PROTOCOL_VERSION;
  messageId: MessageId;
  correlationId?: MessageId;
  type: TType;
  timestamp: string;
  payload: TPayload;
}

export const PluginMessageType = {
  PLUGIN_INITIALIZE_REQUEST: "PLUGIN_INITIALIZE_REQUEST",
  CAPABILITY_LIST_REQUEST: "CAPABILITY_LIST_REQUEST",
  SELECTION_SCAN_REQUEST: "SELECTION_SCAN_REQUEST",
  CAPABILITY_RUN_REQUEST: "CAPABILITY_RUN_REQUEST",
  CAPABILITY_CANCEL_REQUEST: "CAPABILITY_CANCEL_REQUEST",

  PLUGIN_INITIALIZE_RESPONSE: "PLUGIN_INITIALIZE_RESPONSE",
  CAPABILITY_LIST_RESPONSE: "CAPABILITY_LIST_RESPONSE",
  SELECTION_SCAN_RESPONSE: "SELECTION_SCAN_RESPONSE",
  CAPABILITY_RUN_RESPONSE: "CAPABILITY_RUN_RESPONSE",
  CAPABILITY_CANCEL_RESPONSE: "CAPABILITY_CANCEL_RESPONSE",
  PLUGIN_ERROR_RESPONSE: "PLUGIN_ERROR_RESPONSE",

  PLUGIN_READY_EVENT: "PLUGIN_READY_EVENT",
  SELECTION_CHANGED_EVENT: "SELECTION_CHANGED_EVENT",
  CAPABILITY_PROGRESS_EVENT: "CAPABILITY_PROGRESS_EVENT",
  CAPABILITY_COMPLETE_EVENT: "CAPABILITY_COMPLETE_EVENT"
} as const;

export type PluginMessageType = (typeof PluginMessageType)[keyof typeof PluginMessageType];

export interface EmptyPayload {
  readonly empty?: never;
}

export interface CapabilityRunPayload {
  capabilityId: string;
  operationId: OperationId;
  input: unknown;
}

export interface CapabilityCancelPayload {
  operationId: OperationId;
}

export interface CapabilityCancelResult {
  operationId: OperationId;
  cancelled: boolean;
  reason?: string;
}

export interface PluginInitializationData {
  pluginVersion: string;
  protocolVersion: typeof MESSAGE_PROTOCOL_VERSION;
  capabilities: CapabilityMetadata[];
  selection: SelectionSummary;
}

export interface CapabilityProgress {
  operationId: OperationId;
  capabilityId: string;
  phase: string;
  progress: number;
  message?: string;
}

export type PluginInitializeRequest = MessageEnvelope<
  typeof PluginMessageType.PLUGIN_INITIALIZE_REQUEST,
  EmptyPayload
>;
export type CapabilityListRequest = MessageEnvelope<
  typeof PluginMessageType.CAPABILITY_LIST_REQUEST,
  EmptyPayload
>;
export type SelectionScanRequest = MessageEnvelope<
  typeof PluginMessageType.SELECTION_SCAN_REQUEST,
  EmptyPayload
>;
export type CapabilityRunRequest = MessageEnvelope<
  typeof PluginMessageType.CAPABILITY_RUN_REQUEST,
  CapabilityRunPayload
>;
export type CapabilityCancelRequest = MessageEnvelope<
  typeof PluginMessageType.CAPABILITY_CANCEL_REQUEST,
  CapabilityCancelPayload
>;

export type PluginInitializeResponse = MessageEnvelope<
  typeof PluginMessageType.PLUGIN_INITIALIZE_RESPONSE,
  PluginInitializationData
>;
export type CapabilityListResponse = MessageEnvelope<
  typeof PluginMessageType.CAPABILITY_LIST_RESPONSE,
  { capabilities: CapabilityMetadata[] }
>;
export type SelectionScanResponse = MessageEnvelope<
  typeof PluginMessageType.SELECTION_SCAN_RESPONSE,
  { selection: SelectionSummary }
>;
export type CapabilityRunResponse = MessageEnvelope<
  typeof PluginMessageType.CAPABILITY_RUN_RESPONSE,
  { result: CapabilityResult }
>;
export type CapabilityCancelResponse = MessageEnvelope<
  typeof PluginMessageType.CAPABILITY_CANCEL_RESPONSE,
  CapabilityCancelResult
>;
export type PluginErrorResponse = MessageEnvelope<
  typeof PluginMessageType.PLUGIN_ERROR_RESPONSE,
  { error: SerializableError }
>;

export type PluginReadyEvent = MessageEnvelope<
  typeof PluginMessageType.PLUGIN_READY_EVENT,
  PluginInitializationData
>;
export type SelectionChangedEvent = MessageEnvelope<
  typeof PluginMessageType.SELECTION_CHANGED_EVENT,
  { selection: SelectionSummary }
>;
export type CapabilityProgressEvent = MessageEnvelope<
  typeof PluginMessageType.CAPABILITY_PROGRESS_EVENT,
  CapabilityProgress
>;
export type CapabilityCompleteEvent = MessageEnvelope<
  typeof PluginMessageType.CAPABILITY_COMPLETE_EVENT,
  { result: CapabilityResult }
>;

export type PluginRequest =
  | PluginInitializeRequest
  | CapabilityListRequest
  | SelectionScanRequest
  | CapabilityRunRequest
  | CapabilityCancelRequest;

export type PluginResponse =
  | PluginInitializeResponse
  | CapabilityListResponse
  | SelectionScanResponse
  | CapabilityRunResponse
  | CapabilityCancelResponse
  | PluginErrorResponse;

export type PluginEvent =
  | PluginReadyEvent
  | SelectionChangedEvent
  | CapabilityProgressEvent
  | CapabilityCompleteEvent;

export type PluginMessage = PluginRequest | PluginResponse | PluginEvent;

export const requestMessageTypes = [
  PluginMessageType.PLUGIN_INITIALIZE_REQUEST,
  PluginMessageType.CAPABILITY_LIST_REQUEST,
  PluginMessageType.SELECTION_SCAN_REQUEST,
  PluginMessageType.CAPABILITY_RUN_REQUEST,
  PluginMessageType.CAPABILITY_CANCEL_REQUEST
] as const;

export const responseMessageTypes = [
  PluginMessageType.PLUGIN_INITIALIZE_RESPONSE,
  PluginMessageType.CAPABILITY_LIST_RESPONSE,
  PluginMessageType.SELECTION_SCAN_RESPONSE,
  PluginMessageType.CAPABILITY_RUN_RESPONSE,
  PluginMessageType.CAPABILITY_CANCEL_RESPONSE,
  PluginMessageType.PLUGIN_ERROR_RESPONSE
] as const;

export const eventMessageTypes = [
  PluginMessageType.PLUGIN_READY_EVENT,
  PluginMessageType.SELECTION_CHANGED_EVENT,
  PluginMessageType.CAPABILITY_PROGRESS_EVENT,
  PluginMessageType.CAPABILITY_COMPLETE_EVENT
] as const;

export function isResponseMessage(message: PluginMessage): message is PluginResponse {
  return responseMessageTypes.includes(message.type as (typeof responseMessageTypes)[number]);
}

export function isEventMessage(message: PluginMessage): message is PluginEvent {
  return eventMessageTypes.includes(message.type as (typeof eventMessageTypes)[number]);
}
