import { useEffect } from "react";
import type { PluginEvent } from "@aio/shared-contracts";
import type { PluginMessageClient } from "./plugin-message-client";

export function usePluginEvent<TType extends PluginEvent["type"]>(
  client: PluginMessageClient | null,
  type: TType,
  listener: (event: Extract<PluginEvent, { type: TType }>) => void
) {
  useEffect(() => {
    if (!client) {
      return;
    }

    return client.subscribe(type, listener as (event: PluginEvent) => void);
  }, [client, listener, type]);
}
