"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";

export interface JsonEditorChannelState {
  text: string;
  appliedValueStr: string;
  invalidMessage: string | null;
  pendingAppliedValue: Record<string, unknown> | null;
  pendingApplyVersion: number;
}

interface JsonEditorTextChangeResult {
  nextState: JsonEditorChannelState;
}

interface UseJsonEditorChannelOptions {
  label: string;
  value: Record<string, unknown>;
  onApply: (value: Record<string, unknown>) => void;
}

type JsonEditorChannelAction =
  | {
      type: "userEdit";
      text: string;
      label: string;
    }
  | {
      type: "externalValueChanged";
      value: Record<string, unknown>;
    }
  | {
      type: "resetToValue";
      value: Record<string, unknown>;
    }
  | {
      type: "flushPendingApply";
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatInvalidJsonMessage(label: string): string {
  return `Invalid ${label} JSON. Preview is using the last valid value.`;
}

function formatInvalidShapeMessage(label: string): string {
  return `${label} must be a JSON object or null. Preview is using the last valid value.`;
}

function formatEmptyDraftMessage(label: string): string {
  return `Empty ${label} draft. Type null to clear it. Preview is using the last valid value.`;
}

export function serializeJsonEditorValue(
  value: Record<string, unknown>,
): string {
  if (Object.keys(value).length === 0) {
    return "";
  }
  return JSON.stringify(value, null, 2);
}

export function createJsonEditorChannelState(
  value: Record<string, unknown>,
): JsonEditorChannelState {
  return {
    text: serializeJsonEditorValue(value),
    appliedValueStr: JSON.stringify(value),
    invalidMessage: null,
    pendingAppliedValue: null,
    pendingApplyVersion: 0,
  };
}

export function applyJsonEditorTextChange(
  state: JsonEditorChannelState,
  text: string,
  label: string,
): JsonEditorTextChangeResult {
  const trimmed = text.trim();

  if (trimmed === "") {
    return {
      nextState: {
        ...state,
        text,
        invalidMessage: formatEmptyDraftMessage(label),
        pendingAppliedValue: null,
      },
    };
  }

  if (trimmed === "null") {
    return {
      nextState: {
        text,
        appliedValueStr: JSON.stringify({}),
        invalidMessage: null,
        pendingAppliedValue: {},
        pendingApplyVersion: state.pendingApplyVersion + 1,
      },
    };
  }

  try {
    const parsed = JSON.parse(text);
    if (!isRecord(parsed)) {
      return {
        nextState: {
          ...state,
          text,
          invalidMessage: formatInvalidShapeMessage(label),
          pendingAppliedValue: null,
        },
      };
    }

    return {
      nextState: {
        text,
        appliedValueStr: JSON.stringify(parsed),
        invalidMessage: null,
        pendingAppliedValue: parsed,
        pendingApplyVersion: state.pendingApplyVersion + 1,
      },
    };
  } catch {
    return {
      nextState: {
        ...state,
        text,
        invalidMessage: formatInvalidJsonMessage(label),
        pendingAppliedValue: null,
      },
    };
  }
}

export function reconcileJsonEditorChannelState(
  state: JsonEditorChannelState,
  value: Record<string, unknown>,
): JsonEditorChannelState {
  const appliedValueStr = JSON.stringify(value);
  if (state.appliedValueStr === appliedValueStr) {
    return state;
  }

  if (state.invalidMessage) {
    return {
      ...state,
      appliedValueStr,
      pendingAppliedValue: null,
    };
  }

  return createJsonEditorChannelState(value);
}

export function jsonEditorChannelReducer(
  state: JsonEditorChannelState,
  action: JsonEditorChannelAction,
): JsonEditorChannelState {
  switch (action.type) {
    case "userEdit":
      return applyJsonEditorTextChange(state, action.text, action.label)
        .nextState;
    case "externalValueChanged":
      return reconcileJsonEditorChannelState(state, action.value);
    case "resetToValue":
      return createJsonEditorChannelState(action.value);
    case "flushPendingApply":
      if (state.pendingAppliedValue === null) {
        return state;
      }
      return {
        ...state,
        pendingAppliedValue: null,
      };
    default:
      return state;
  }
}

export function useJsonEditorChannel({
  label,
  value,
  onApply,
}: UseJsonEditorChannelOptions) {
  const appliedValueStr = useMemo(() => JSON.stringify(value), [value]);
  const [state, dispatch] = useReducer(
    jsonEditorChannelReducer,
    value,
    createJsonEditorChannelState,
  );

  useEffect(() => {
    dispatch({ type: "externalValueChanged", value });
  }, [appliedValueStr, value]);

  useEffect(() => {
    if (state.pendingAppliedValue === null) {
      return;
    }

    onApply(state.pendingAppliedValue);
    dispatch({ type: "flushPendingApply" });
  }, [onApply, state.pendingAppliedValue, state.pendingApplyVersion]);

  const handleTextChange = useCallback(
    (text: string) => {
      dispatch({ type: "userEdit", text, label });
    },
    [label],
  );

  const resetToValue = useCallback((nextValue: Record<string, unknown>) => {
    dispatch({ type: "resetToValue", value: nextValue });
  }, []);

  return {
    text: state.text,
    invalidMessage: state.invalidMessage,
    handleTextChange,
    resetToValue,
  };
}
