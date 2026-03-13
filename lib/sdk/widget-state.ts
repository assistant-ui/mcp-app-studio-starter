"use client";

import { useWidgetState as useBaseWidgetState } from "mcp-app-studio";
import { useCallback, useEffect, useReducer } from "react";
import {
  type OpenAIChannelSnapshot,
  useWorkbenchOpenAIChannelSnapshot,
} from "./openai-channel";

export const NO_OPTIMISTIC_WIDGET_STATE = Symbol("no-optimistic-widget-state");

export interface WidgetStateControllerState<T> {
  optimisticState: T | null | typeof NO_OPTIMISTIC_WIDGET_STATE;
}

type WidgetStateControllerAction<T> =
  | {
      type: "localWrite";
      value: T | null;
    }
  | {
      type: "liveSync";
    };

export function createWidgetStateControllerState<
  T,
>(): WidgetStateControllerState<T> {
  return {
    optimisticState: NO_OPTIMISTIC_WIDGET_STATE,
  };
}

export function widgetStateControllerReducer<T>(
  state: WidgetStateControllerState<T>,
  action: WidgetStateControllerAction<T>,
): WidgetStateControllerState<T> {
  switch (action.type) {
    case "localWrite":
      return {
        optimisticState: action.value,
      };
    case "liveSync":
      return {
        optimisticState: NO_OPTIMISTIC_WIDGET_STATE,
      };
    default:
      return state;
  }
}

export function resolveWidgetStateValue<T>({
  baseState,
  liveState,
  optimisticState,
}: {
  baseState: T | null;
  liveState: OpenAIChannelSnapshot<T>;
  optimisticState: T | null | typeof NO_OPTIMISTIC_WIDGET_STATE;
}): T | null {
  if (!liveState.available) {
    return baseState;
  }

  if (optimisticState !== NO_OPTIMISTIC_WIDGET_STATE) {
    return optimisticState;
  }

  return liveState.value;
}

export function useWidgetState<T = Record<string, unknown>>(): [
  T | null,
  (state: T | null) => void,
] {
  const [baseState, setBaseState] = useBaseWidgetState<T>();
  const liveState = useWorkbenchOpenAIChannelSnapshot<T>("widgetState");
  const [controllerState, dispatch] = useReducer(
    widgetStateControllerReducer<T>,
    undefined,
    createWidgetStateControllerState<T>,
  );

  useEffect(() => {
    if (!liveState.available) {
      return;
    }

    dispatch({ type: "liveSync" });
  }, [liveState.available, liveState.value]);

  const setWidgetState = useCallback(
    (state: T | null) => {
      setBaseState(state);
      if (liveState.available) {
        dispatch({ type: "localWrite", value: state });
      }
    },
    [liveState.available, setBaseState],
  );

  return [
    resolveWidgetStateValue({
      baseState,
      liveState,
      optimisticState: controllerState.optimisticState,
    }),
    setWidgetState,
  ];
}
