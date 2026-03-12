"use client";

import { useSyncExternalStore } from "react";

export const OPENAI_SET_GLOBALS_EVENT = "openai:set_globals" as const;

export type OpenAIChannelField =
  | "toolInput"
  | "toolOutput"
  | "toolResponseMetadata"
  | "widgetState";

interface OpenAIReadableGlobals {
  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown> | null;
  toolResponseMetadata?: Record<string, unknown> | null;
  widgetState?: Record<string, unknown> | null;
}

interface OpenAISetGlobalsEventDetail {
  globals?: Partial<OpenAIReadableGlobals>;
}

interface OpenAIExtensionWindow extends Window {
  openai?: OpenAIReadableGlobals;
}

function getOpenAIWindow(): OpenAIExtensionWindow | null {
  if (typeof window === "undefined") return null;
  return window as OpenAIExtensionWindow;
}

export function readOpenAIChannel<T>(field: OpenAIChannelField): T | null {
  const openai = getOpenAIWindow()?.openai;
  const value = openai?.[field];
  return value === undefined ? null : (value as T | null);
}

export function subscribeToOpenAIChannel(
  field: OpenAIChannelField,
  callback: () => void,
): () => void {
  const currentWindow = getOpenAIWindow();
  if (!currentWindow) {
    return () => {};
  }

  const handleGlobals = (event: Event) => {
    const detail = (event as CustomEvent<OpenAISetGlobalsEventDetail>).detail;
    if (!detail?.globals || !(field in detail.globals)) {
      return;
    }
    callback();
  };

  currentWindow.addEventListener(
    OPENAI_SET_GLOBALS_EVENT,
    handleGlobals as EventListener,
  );

  return () => {
    currentWindow.removeEventListener(
      OPENAI_SET_GLOBALS_EVENT,
      handleGlobals as EventListener,
    );
  };
}

export function useOpenAIChannel<T>(field: OpenAIChannelField): T | null {
  return useSyncExternalStore(
    (callback) => subscribeToOpenAIChannel(field, callback),
    () => readOpenAIChannel<T>(field),
    () => null,
  );
}
