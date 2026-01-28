"use client";

import { UniversalProvider } from "mcp-app-studio";
import type { ReactNode } from "react";

interface ProductionProviderProps {
  children: ReactNode;
  appInfo?: { name: string; version: string };
}

export function ProductionProvider({
  children,
  appInfo,
}: ProductionProviderProps) {
  return <UniversalProvider appInfo={appInfo}>{children}</UniversalProvider>;
}

export {
  useCallTool,
  useCapabilities,
  useDisplayMode,
  useFeature,
  useHostContext,
  useLog,
  useOpenLink,
  usePlatform,
  useSendMessage,
  useTheme,
  useToolInput,
  useToolInputPartial,
  useToolResult,
  useUpdateModelContext,
  useWidgetState,
} from "mcp-app-studio";
