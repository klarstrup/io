"use client";

import {
  AblyMessageCallback,
  ChannelParameters,
  useChannel as useAblyChannel,
} from "ably/react";

export const useChannel =
  typeof window !== "undefined"
    ? useAblyChannel
    : (
        _channelNameOrNameAndOptions: ChannelParameters,
        _callbackOnMessage?: AblyMessageCallback,
      ): unknown => {
        // No-op for server-side rendering
        return {
          publish: (_message: unknown) => {
            // no-op
          },
          unsubscribe: () => {
            // no-op
          },
        };
      };
