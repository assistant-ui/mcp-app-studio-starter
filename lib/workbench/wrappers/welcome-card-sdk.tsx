"use client";

import { WelcomeCard } from "@/components/examples/welcome-card";
import { cn } from "@/lib/ui/cn";
import {
  useDisplayMode,
  useRequestDisplayMode,
  useTheme,
} from "@/lib/workbench/openai-context";

interface WelcomeCardInput {
  title?: string;
  message?: string;
}

export function WelcomeCardSDK(props: Record<string, unknown>) {
  const input = props as WelcomeCardInput;
  const theme = useTheme();
  const displayMode = useDisplayMode();
  const requestDisplayMode = useRequestDisplayMode();
  const isDark = theme === "dark";

  const title = input.title ?? "Welcome!";
  const message =
    input.message ??
    "This is your MCP App. Edit this component to build something amazing.";

  const handleExpand = () => {
    requestDisplayMode({ mode: "fullscreen" });
  };

  const handleCollapse = () => {
    requestDisplayMode({ mode: "inline" });
  };

  const actionLabel =
    displayMode === "fullscreen" ? "Exit Fullscreen" : "View Fullscreen";
  const handleAction =
    displayMode === "fullscreen" ? handleCollapse : handleExpand;

  return (
    <WelcomeCard
      title={title}
      message={message}
      theme={theme}
      actions={
        <button
          onClick={handleAction}
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
