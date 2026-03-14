"use client";

import { useSyncExternalStore } from "react";
import {
  OPENAI_SET_GLOBALS_EVENT,
  WORKBENCH_OPENAI_SHIM_MARKER,
} from "./openai-channel-contract";

export { OPENAI_SET_GLOBALS_EVENT, WORKBENCH_OPENAI_SHIM_MARKER };

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
  __MCP_APP_STUDIO_WORKBENCH_OPENAI_SHIM__?: boolean;
}

function getOpenAIWindow(): OpenAIExtensionWindow | null {
  if (typeof window === "undefined") return null;
  return window as OpenAIExtensionWindow;
}

export function isWorkbenchOpenAIShimWindow(
  currentWindow:
    | Pick<OpenAIExtensionWindow, typeof WORKBENCH_OPENAI_SHIM_MARKER>
    | null
    | undefined,
): boolean {
  return currentWindow?.[WORKBENCH_OPENAI_SHIM_MARKER] === true;
}

export interface OpenAIChannelSnapshot<T> {
  available: boolean;
  value: T | null;
}

const channelSnapshotCache = new Map<
  OpenAIChannelField,
  OpenAIChannelSnapshot<unknown>
>();

function getCachedChannelSnapshot<T>(
  field: OpenAIChannelField,
  available: boolean,
  value: T | null,
): OpenAIChannelSnapshot<T> {
  const cached = channelSnapshotCache.get(field);
  if (cached && cached.available === available && cached.value === value) {
    return cached as OpenAIChannelSnapshot<T>;
  }

  const snapshot: OpenAIChannelSnapshot<T> = {
    available,
    value,
  };
  channelSnapshotCache.set(field, snapshot);
  return snapshot;
}

export function readOpenAIChannelSnapshot<T>(
  field: OpenAIChannelField,
): OpenAIChannelSnapshot<T> {
  const openai = getOpenAIWindow()?.openai;
  if (!openai || !(field in openai)) {
    return getCachedChannelSnapshot<T>(field, false, null);
  }

  const value = openai[field];
  return getCachedChannelSnapshot(
    field,
    true,
    value === undefined ? null : (value as T | null),
  );
}

export function readOpenAIChannel<T>(field: OpenAIChannelField): T | null {
  return readOpenAIChannelSnapshot<T>(field).value;
}

export function readWorkbenchOpenAIChannelSnapshot<T>(
  field: OpenAIChannelField,
): OpenAIChannelSnapshot<T> {
  const currentWindow = getOpenAIWindow();
  if (!currentWindow || !isWorkbenchOpenAIShimWindow(currentWindow)) {
    return getCachedChannelSnapshot<T>(field, false, null);
  }

  return readOpenAIChannelSnapshot<T>(field);
}

export function subscribeToWorkbenchOpenAIChannel(
  field: OpenAIChannelField,
  callback: () => void,
): () => void {
  const currentWindow = getOpenAIWindow();
  if (!currentWindow || !isWorkbenchOpenAIShimWindow(currentWindow)) {
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

export function useWorkbenchOpenAIChannelSnapshot<T>(
  field: OpenAIChannelField,
): OpenAIChannelSnapshot<T> {
  return useSyncExternalStore(
    (callback) => subscribeToWorkbenchOpenAIChannel(field, callback),
    () => readWorkbenchOpenAIChannelSnapshot<T>(field),
    () => ({
      available: false,
      value: null,
    }),
  );
}
