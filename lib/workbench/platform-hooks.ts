"use client";

import { useCallback, useState } from "react";
import { type Platform, useWorkbenchStore } from "./store";

export interface WorkbenchCapabilities {
  widgetState: boolean;
  toolInputPartial: boolean;
  modelContext: boolean;
  fileUpload: boolean;
  fileDownload: boolean;
  modal: boolean;
  closeWidget: boolean;
  sendMessage: boolean;
  displayModes: boolean;
  sizeReporting: boolean;
  log: boolean;
  callTool: boolean;
  openLink: boolean;
  toolCancellation: boolean;
  teardown: boolean;
}

const WORKBENCH_CAPABILITIES: WorkbenchCapabilities = {
  widgetState: true,
  fileUpload: true,
  fileDownload: true,
  modal: true,
  closeWidget: true,
  toolInputPartial: true,
  modelContext: true,
  log: true,
  toolCancellation: true,
  teardown: true,
  callTool: true,
  openLink: true,
  sendMessage: true,
  sizeReporting: true,
  displayModes: true,
};

export function usePlatform(): Platform {
  return "chatgpt";
}

export function useCapabilities(): WorkbenchCapabilities {
  return WORKBENCH_CAPABILITIES;
}

export function useToolInputPartial<T = Record<string, unknown>>(): T | null {
  const [partialInput, _setPartialInput] = useState<T | null>(null);
  return partialInput;
}

export function useUpdateModelContext() {
  const store = useWorkbenchStore();

  return useCallback(
    async (ctx: {
      content?: Array<{ type: string; text?: string }>;
      structuredContent?: Record<string, unknown>;
    }): Promise<void> => {
      store.addConsoleEntry({
        type: "event",
        method: "updateModelContext",
        args: ctx,
      });
    },
    [store],
  );
}

export function useLog() {
  const store = useWorkbenchStore();

  return useCallback(
    (level: "debug" | "info" | "warning" | "error", data: string): void => {
      store.addConsoleEntry({
        type: "event",
        method: `log.${level}`,
        args: { level, data },
      });
    },
    [store],
  );
}

export function useFeature(feature: keyof WorkbenchCapabilities): boolean {
  const capabilities = useCapabilities();
  return capabilities[feature] ?? false;
}

export function usePersistentState<T>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const store = useWorkbenchStore();
  const widgetState = store.widgetState;

  const value = ((widgetState?.[key] as T) ?? defaultValue) as T;

  const setValue = useCallback(
    (newValue: T) => {
      store.updateWidgetState({ [key]: newValue });
      store.addConsoleEntry({
        type: "event",
        method: `usePersistentState("${key}")`,
        args: newValue,
      });
    },
    [key, store],
  );

  return [value, setValue];
}

export function useModelContext() {
  const store = useWorkbenchStore();

  const setContext = useCallback(
    (data: Record<string, unknown>) => {
      store.updateWidgetState({ __modelContext: data });
      store.addConsoleEntry({
        type: "event",
        method: "useModelContext.setContext",
        args: data,
      });
    },
    [store],
  );

  return { setContext };
}

export type ToolInputStatus = "loading" | "streaming" | "ready";

export function useToolInputStatus(): ToolInputStatus {
  const store = useWorkbenchStore();
  const toolInput = store.toolInput;
  return toolInput && Object.keys(toolInput).length > 0 ? "ready" : "loading";
}

export function useChatGPTBridge() {
  return null;
}

export function useMCPBridge() {
  return null;
}
