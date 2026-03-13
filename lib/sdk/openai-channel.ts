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

export interface OpenAIChannelSnapshot<T> {
  available: boolean;
  value: T | null;
}

export function readOpenAIChannelSnapshot<T>(
  field: OpenAIChannelField,
): OpenAIChannelSnapshot<T> {
  const openai = getOpenAIWindow()?.openai;
  if (!openai || !(field in openai)) {
    return {
      available: false,
      value: null,
    };
  }

  const value = openai[field];
  return {
    available: true,
    value: value === undefined ? null : (value as T | null),
  };
}

export function readOpenAIChannel<T>(field: OpenAIChannelField): T | null {
  return readOpenAIChannelSnapshot<T>(field).value;
}

export function useOpenAIChannelAvailability(
  field: OpenAIChannelField,
): boolean {
  return useSyncExternalStore(
    (callback) => subscribeToOpenAIChannel(field, callback),
    () => readOpenAIChannelSnapshot(field).available,
    () => false,
  );
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
