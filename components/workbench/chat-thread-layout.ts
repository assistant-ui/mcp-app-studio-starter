"use client";

import { cn } from "@/lib/ui/cn";

export type LayoutVariant = "fullscreen" | "pip" | "conversation" | "isolated";
export type DisplayMode = "fullscreen" | "pip" | "inline";

export interface LayoutConfig {
  variant: LayoutVariant;
  showConversationContext: boolean;
  showPipMessages: boolean;
  scrollContainerClassName: string;
  contentStackClassName: string;
  morphWrapperClassName: string;
  morphContainerClassName: string;
  morphContainerStyle: React.CSSProperties;
  contentViewportClassName: string;
}

export function getLayoutVariant({
  displayMode,
  conversationMode,
}: {
  displayMode: DisplayMode;
  conversationMode: boolean;
}): LayoutVariant {
  if (displayMode === "fullscreen") return "fullscreen";
  if (displayMode === "pip") return "pip";
  if (conversationMode) return "conversation";
  return "isolated";
}

export function getLayoutConfig({
  variant,
  isDesktopDevice,
  isDark: _isDark,
  widgetHeight,
}: {
  variant: LayoutVariant;
  isDesktopDevice: boolean;
  isDark: boolean;
  widgetHeight: number;
}): LayoutConfig {
  const cardTone = "border-border bg-background";

  switch (variant) {
    case "fullscreen":
      return {
        variant,
        showConversationContext: false,
        showPipMessages: false,
        scrollContainerClassName: "h-full w-full relative overflow-hidden",
        contentStackClassName: "mx-auto flex flex-col w-full h-full max-w-none",
        morphWrapperClassName: "flex-1 w-full h-full",
        morphContainerClassName: cn(
          "h-full w-full overflow-auto transition-colors",
          "bg-background",
        ),
        morphContainerStyle: { overscrollBehavior: "contain" },
        contentViewportClassName: "h-full",
      };
    case "pip":
      return {
        variant,
        showConversationContext: false,
        showPipMessages: true,
        scrollContainerClassName:
          "h-full w-full relative overflow-y-auto scrollbar-subtle",
        contentStackClassName:
          "mx-auto flex flex-col w-full max-w-[770px] gap-3 pt-3 p-4 pb-24",
        morphWrapperClassName:
          "sticky top-3 z-10 flex justify-center w-full pointer-events-none",
        morphContainerClassName: cn(
          "pointer-events-auto w-full max-w-[770px] overflow-hidden rounded-2xl border shadow-lg transition-colors",
          cardTone,
        ),
        morphContainerStyle: { height: widgetHeight, maxHeight: widgetHeight },
        contentViewportClassName: "h-full overflow-auto",
      };
    case "conversation":
      return {
        variant,
        showConversationContext: true,
        showPipMessages: false,
        scrollContainerClassName:
          "h-full w-full relative overflow-y-auto scrollbar-subtle",
        contentStackClassName:
          "mx-auto flex flex-col w-full max-w-[770px] p-4 pb-24 gap-4",
        morphWrapperClassName: "w-full z-10 flex justify-center",
        morphContainerClassName: cn(
          "w-full max-w-[770px] overflow-hidden rounded-2xl border shadow-sm transition-colors",
          cardTone,
        ),
        morphContainerStyle: { height: widgetHeight, maxHeight: widgetHeight },
        contentViewportClassName: "h-full overflow-auto",
      };
    default:
      return {
        variant: "isolated",
        showConversationContext: false,
        showPipMessages: false,
        scrollContainerClassName: "h-full w-full relative overflow-hidden",
        contentStackClassName:
          "mx-auto flex flex-col w-full h-full max-w-[770px]",
        morphWrapperClassName: cn(
          "relative z-10 flex h-full w-full flex-col overflow-hidden px-4 transition-colors",
          isDesktopDevice
            ? "items-center justify-center"
            : "items-start justify-start pt-4",
        ),
        morphContainerClassName: cn(
          "w-full max-w-[770px] overflow-hidden rounded-2xl border shadow-sm transition-colors",
          cardTone,
        ),
        morphContainerStyle: { height: widgetHeight, maxHeight: widgetHeight },
        contentViewportClassName: "h-full overflow-auto",
      };
  }
}
