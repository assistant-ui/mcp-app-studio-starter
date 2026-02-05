"use client";

import { useMemo } from "react";
import { WelcomeCard } from "@/components/examples/welcome-card";
import { useDisplayMode, useTheme, useToolInput } from "@/lib/sdk";
import { cn } from "@/lib/ui/cn";

interface WelcomeCardInput {
  title?: string;
  message?: string;
}

/**
 * This wrapper is the widget "entry point" used by the workbench and export flow.
 *
 * Important:
 * - Tool input should be read via `useToolInput()` (MCP-first).
 * - In the local workbench we simulate an MCP Apps host. We also provide an
 *   optional `window.openai` shim so widgets can exercise ChatGPT-only
 *   extensions (files, widgetState, modals) during development.
 */
export function WelcomeCardSDK() {
  const toolInput = useToolInput<WelcomeCardInput>();
  const input = useMemo(() => toolInput ?? {}, [toolInput]);

  const theme = useTheme();
  const [displayMode, setDisplayMode] = useDisplayMode();
  const isDark = theme === "dark";

  const title = input.title ?? "Welcome!";
  const message =
    input.message ??
    "This is your MCP App. Edit this component to build something amazing.";

  const handleToggleFullscreen = async () => {
    await setDisplayMode(
      displayMode === "fullscreen" ? "inline" : "fullscreen",
    );
  };

  const actionLabel =
    displayMode === "fullscreen" ? "Exit Fullscreen" : "View Fullscreen";

  return (
    <WelcomeCard
      title={title}
      message={message}
      theme={theme}
      actions={
        <button
          onClick={handleToggleFullscreen}
          className={cn(
            "rounded-lg px-4 py-2 font-medium text-sm transition-colors",
            isDark
              ? "bg-white text-zinc-900 hover:bg-zinc-200"
              : "bg-zinc-900 text-white hover:bg-zinc-700",
          )}
        >
          {actionLabel}
        </button>
      }
    />
  );
}
