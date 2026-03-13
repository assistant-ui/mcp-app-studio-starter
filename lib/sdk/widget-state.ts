"use client";

import { useWidgetState as useBaseWidgetState } from "mcp-app-studio";
import { useCallback } from "react";
import {
  type OpenAIChannelSnapshot,
  useOpenAIChannel,
  useOpenAIChannelAvailability,
} from "./openai-channel";

function resolveWidgetStateValue<T>(
  channel: OpenAIChannelSnapshot<T>,
  localState: T | null,
): T | null {
  return channel.available ? channel.value : localState;
}

export function useWidgetState<T = Record<string, unknown>>(): [
  T | null,
  (state: T | null) => void,
] {
  const [localState, setLocalState] = useBaseWidgetState<T>();
  const liveState = useOpenAIChannel<T>("widgetState");
  const isLiveStateChannelAvailable =
    useOpenAIChannelAvailability("widgetState");

  const setWidgetState = useCallback(
    (state: T | null) => {
      setLocalState(state);
    },
    [setLocalState],
  );

  return [
    resolveWidgetStateValue(
      {
        available: isLiveStateChannelAvailable,
        value: liveState,
      },
      localState,
    ),
    setWidgetState,
  ];
}
