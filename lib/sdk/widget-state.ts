"use client";

import { useWidgetState as useBaseWidgetState } from "mcp-app-studio";
import { useCallback, useEffect, useState } from "react";
import { useWorkbenchOpenAIChannelSnapshot } from "./openai-channel";

const NO_OPTIMISTIC_WIDGET_STATE = Symbol("no-optimistic-widget-state");

export function useWidgetState<T = Record<string, unknown>>(): [
  T | null,
  (state: T | null) => void,
] {
  const [baseState, setBaseState] = useBaseWidgetState<T>();
  const liveState = useWorkbenchOpenAIChannelSnapshot<T>("widgetState");
  const [optimisticState, setOptimisticState] = useState<
    T | null | typeof NO_OPTIMISTIC_WIDGET_STATE
  >(NO_OPTIMISTIC_WIDGET_STATE);

  useEffect(() => {
    if (!liveState.available) {
      return;
    }

    setOptimisticState(NO_OPTIMISTIC_WIDGET_STATE);
  }, [liveState.available, liveState.value]);

  const setWidgetState = useCallback(
    (state: T | null) => {
      setBaseState(state);
      if (liveState.available) {
        setOptimisticState(state);
      }
    },
    [liveState.available, setBaseState],
  );

  const resolvedState = !liveState.available
    ? baseState
    : optimisticState !== NO_OPTIMISTIC_WIDGET_STATE
      ? optimisticState
      : liveState.value;

  return [resolvedState, setWidgetState];
}
