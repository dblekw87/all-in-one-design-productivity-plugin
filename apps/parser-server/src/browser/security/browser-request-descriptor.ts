export type BrowserResourceType =
  | "document"
  | "stylesheet"
  | "image"
  | "media"
  | "font"
  | "script"
  | "texttrack"
  | "xhr"
  | "fetch"
  | "eventsource"
  | "websocket"
  | "manifest"
  | "other";

export interface BrowserRequestDescriptor {
  requestId: string;
  url: string;
  method: string;
  resourceType: BrowserResourceType;
  isNavigationRequest: boolean;
  frameUrl?: string;
  redirectedFromRequestId?: string;
  redirectedFromUrl?: string;
}

export function normalizeResourceType(resourceType: string): BrowserResourceType {
  switch (resourceType) {
    case "document":
    case "stylesheet":
    case "image":
    case "media":
    case "font":
    case "script":
    case "texttrack":
    case "xhr":
    case "fetch":
    case "eventsource":
    case "websocket":
    case "manifest":
      return resourceType;
    default:
      return "other";
  }
}
