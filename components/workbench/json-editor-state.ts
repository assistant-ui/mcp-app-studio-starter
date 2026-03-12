"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface JsonEditorChannelState {
  text: string;
  appliedValueStr: string;
  invalidMessage: string | null;
}

interface JsonEditorTextChangeResult {
  nextState: JsonEditorChannelState;
  appliedValue: Record<string, unknown> | null;
}

interface UseJsonEditorChannelOptions {
  label: string;
  value: Record<string, unknown>;
  onApply: (value: Record<string, unknown>) => void;
}

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
      },
      appliedValue: null,
    };
  }

  if (trimmed === "null") {
    return {
      nextState: {
        text,
        appliedValueStr: JSON.stringify({}),
        invalidMessage: null,
      },
      appliedValue: {},
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
        },
        appliedValue: null,
      };
    }

    return {
      nextState: {
        text,
        appliedValueStr: JSON.stringify(parsed),
        invalidMessage: null,
      },
      appliedValue: parsed,
    };
  } catch {
    return {
      nextState: {
        ...state,
        text,
        invalidMessage: formatInvalidJsonMessage(label),
      },
      appliedValue: null,
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
    };
  }

  return createJsonEditorChannelState(value);
}

export function useJsonEditorChannel({
  label,
  value,
  onApply,
}: UseJsonEditorChannelOptions) {
  const appliedValueStr = useMemo(() => JSON.stringify(value), [value]);
  const [state, setState] = useState(() => createJsonEditorChannelState(value));

  useEffect(() => {
    setState((prev) => {
      if (prev.appliedValueStr === appliedValueStr) {
        return prev;
      }
      return reconcileJsonEditorChannelState(prev, value);
    });
  }, [appliedValueStr, value]);

  const handleTextChange = useCallback(
    (text: string) => {
      setState((prev) => {
        const result = applyJsonEditorTextChange(prev, text, label);
        if (result.appliedValue) {
          onApply(result.appliedValue);
        }
        return result.nextState;
      });
    },
    [label, onApply],
  );

  const resetToValue = useCallback((nextValue: Record<string, unknown>) => {
    setState(createJsonEditorChannelState(nextValue));
  }, []);

  return {
    text: state.text,
    invalidMessage: state.invalidMessage,
    handleTextChange,
    resetToValue,
  };
}
