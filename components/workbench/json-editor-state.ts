"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface JsonEditorChannelState {
  text: string;
  appliedValueStr: string;
  invalidMessage: string | null;
  pendingAppliedValue: Record<string, unknown> | null;
}

type EmptyDraftBehavior = "reject" | "clear";

interface UseJsonEditorChannelOptions {
  label: string;
  value: Record<string, unknown>;
  onApply: (value: Record<string, unknown>) => void;
  emptyDraftBehavior?: EmptyDraftBehavior;
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

function createAppliedDraftState(
  text: string,
  value: Record<string, unknown>,
): JsonEditorChannelState {
  return {
    text,
    appliedValueStr: JSON.stringify(value),
    invalidMessage: null,
    pendingAppliedValue: value,
  };
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
  };
}

export function applyJsonEditorTextChange(
  state: JsonEditorChannelState,
  text: string,
  label: string,
  emptyDraftBehavior: EmptyDraftBehavior = "reject",
): JsonEditorChannelState {
  const trimmed = text.trim();

  if (trimmed === "") {
    if (emptyDraftBehavior === "clear") {
      return createAppliedDraftState(text, {});
    }

    return {
      ...state,
      text,
      invalidMessage: formatEmptyDraftMessage(label),
      pendingAppliedValue: null,
    };
  }

  if (trimmed === "null") {
    return createAppliedDraftState(text, {});
  }

  try {
    const parsed = JSON.parse(text);
    if (!isRecord(parsed)) {
      return {
        ...state,
        text,
        invalidMessage: formatInvalidShapeMessage(label),
        pendingAppliedValue: null,
      };
    }

    return createAppliedDraftState(text, parsed);
  } catch {
    return {
      ...state,
      text,
      invalidMessage: formatInvalidJsonMessage(label),
      pendingAppliedValue: null,
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

export function useJsonEditorChannel({
  label,
  value,
  onApply,
  emptyDraftBehavior,
}: UseJsonEditorChannelOptions) {
  const appliedValueStr = useMemo(() => JSON.stringify(value), [value]);
  const [state, setState] = useState(() => createJsonEditorChannelState(value));

  useEffect(() => {
    setState((currentState) =>
      reconcileJsonEditorChannelState(currentState, value),
    );
  }, [appliedValueStr, value]);

  useEffect(() => {
    if (state.pendingAppliedValue === null) {
      return;
    }

    onApply(state.pendingAppliedValue);
    setState((currentState) => {
      if (currentState.pendingAppliedValue === null) {
        return currentState;
      }

      return {
        ...currentState,
        pendingAppliedValue: null,
      };
    });
  }, [onApply, state.pendingAppliedValue]);

  const handleTextChange = useCallback(
    (text: string) => {
      setState((currentState) =>
        applyJsonEditorTextChange(
          currentState,
          text,
          label,
          emptyDraftBehavior,
        ),
      );
    },
    [emptyDraftBehavior, label],
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
