"use client";

import { useCallback, useState } from "react";
import {
  type Platform,
  useWorkbenchPlatform,
  useWorkbenchStore,
} from "./store";

export interface WorkbenchCapabilities {
  widgetState: boolean;
  toolInputPartial: boolean;
  modelContext: boolean;
  fileUpload: boolean;
  sendMessage: boolean;
  displayModes: boolean;
  log: boolean;
}

const CHATGPT_CAPABILITIES: WorkbenchCapabilities = {
  widgetState: true,
  toolInputPartial: false,
  modelContext: false,
  fileUpload: true,
  sendMessage: true,
  displayModes: true,
  log: false,
};

const MCP_CAPABILITIES: WorkbenchCapabilities = {
  widgetState: false,
  toolInputPartial: true,
  modelContext: true,
  fileUpload: false,
  sendMessage: true,
  displayModes: true,
  log: true,
};

export function usePlatform(): Platform {
  return useWorkbenchPlatform();
}

export function useCapabilities(): WorkbenchCapabilities {
  const platform = usePlatform();
  return platform === "mcp" ? MCP_CAPABILITIES : CHATGPT_CAPABILITIES;
}

export function useToolInputPartial<T = Record<string, unknown>>(): T | null {
  const platform = usePlatform();
  const [partialInput, _setPartialInput] = useState<T | null>(null);

  if (platform !== "mcp") {
    return null;
  }

  return partialInput;
}

export function useUpdateModelContext() {
  const store = useWorkbenchStore();
  const platform = usePlatform();

  return useCallback(
    async (ctx: {
      content?: Array<{ type: string; text?: string }>;
      structuredContent?: Record<string, unknown>;
    }): Promise<void> => {
      if (platform !== "mcp") {
        console.warn(
          "[Workbench] useUpdateModelContext is only available on MCP. " +
            "On ChatGPT, consider using useWidgetState instead.",
        );
        return;
      }

      store.addConsoleEntry({
        type: "event",
        method: "updateModelContext",
        args: ctx,
      });
    },
    [store, platform],
  );
}

export function useLog() {
  const store = useWorkbenchStore();
  const platform = usePlatform();

  return useCallback(
    (level: "debug" | "info" | "warning" | "error", data: string): void => {
      if (platform !== "mcp") {
        console.warn(
          "[Workbench] useLog is only available on MCP hosts. " +
            "Falling back to console.log.",
        );
        console.log(`[${level}]`, data);
        return;
      }

      store.addConsoleEntry({
        type: "event",
        method: `log.${level}`,
        args: { level, data },
      });
    },
    [store, platform],
  );
}

export function useFeature(feature: keyof WorkbenchCapabilities): boolean {
  const capabilities = useCapabilities();
  return capabilities[feature] ?? false;
}
