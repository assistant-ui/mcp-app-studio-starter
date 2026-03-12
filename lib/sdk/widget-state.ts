"use client";

import { useWidgetState as useBaseWidgetState } from "mcp-app-studio";
import { useCallback } from "react";
import { useOpenAIChannel } from "./openai-channel";

export function useWidgetState<T = Record<string, unknown>>(): [
  T | null,
  (state: T | null) => void,
] {
  const [localState, setLocalState] = useBaseWidgetState<T>();
  const liveState = useOpenAIChannel<T>("widgetState");

  const setWidgetState = useCallback(
    (state: T | null) => {
      setLocalState(state);
    },
    [setLocalState],
  );

  return [liveState ?? localState, setWidgetState];
}
