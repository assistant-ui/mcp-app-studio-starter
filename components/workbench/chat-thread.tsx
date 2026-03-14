"use client";

import { MapPin, MessageCircle } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/ui/cn";
import { workbenchComponents } from "@/lib/workbench/component-registry";
import type { ConversationContext } from "@/lib/workbench/mock-config";
import {
  useConversationMode,
  useDeviceType,
  useDisplayMode,
  useSelectedComponent,
  useWorkbenchStore,
} from "@/lib/workbench/store";
import { getLayoutConfig, getLayoutVariant } from "./chat-thread-layout";
import { MorphContainer } from "./component-renderer";

interface MockMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const MOCK_MESSAGES: MockMessage[] = [
  { id: "1", role: "user", content: "Can you help me with this?" },
  {
    id: "2",
    role: "assistant",
    content:
      "Of course! I've prepared something for you. Take a look at the interactive view above.",
  },
];

const MOCK_MESSAGES_AFTER: MockMessage[] = [
  { id: "3", role: "user", content: "That looks great, thanks!" },
  {
    id: "4",
    role: "assistant",
    content:
      "You're welcome! Let me know if you need anything else or want to make changes.",
  },
];

const WORKBENCH_COMPONENTS_BY_ID = new Map(
  workbenchComponents.map((component) => [component.id, component] as const),
);

function MessageBubble({
  sender,
  content,
  isDark,
}: {
  sender: "user" | "assistant";
  content: string;
  isDark: boolean;
}) {
  const isUser = sender === "user";
  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? isDark
              ? "bg-blue-600 text-white"
              : "bg-blue-500 text-white"
            : isDark
              ? "bg-neutral-800 text-neutral-100"
              : "bg-neutral-100 text-neutral-900",
        )}
      >
        {content}
      </div>
    </div>
  );
}

function MessageList({
  messages,
  isDark,
}: {
  messages: MockMessage[];
  isDark: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          sender={msg.role}
          content={msg.content}
          isDark={isDark}
        />
      ))}
    </div>
  );
}

function AppIndicator({
  appId,
  appName,
  isDark,
}: {
  appId: string;
  appName: string;
  isDark: boolean;
}) {
  const iconMap: Record<string, typeof MapPin> = {
    "poi-map": MapPin,
    welcome: MessageCircle,
  };
  const Icon = iconMap[appId] || MessageCircle;

  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-6 items-center justify-center rounded-full",
            isDark ? "bg-amber-600" : "bg-amber-500",
          )}
        >
          <Icon className="size-3 text-white" />
        </div>
        <span
          className={cn(
            "font-medium text-sm",
            isDark ? "text-neutral-200" : "text-neutral-700",
          )}
        >
          {appName}
        </span>
      </div>
    </div>
  );
}

function getDefaultUserMessage(appId: string): string {
  const messages: Record<string, string> = {
    "poi-map":
      "Can you show me some interesting places to visit in San Francisco?",
    welcome: "What can this app do?",
    chart: "Show me a chart of the data",
    form: "Help me fill out this form",
  };
  return messages[appId] ?? "Can you help me with this?";
}

function getDefaultAssistantResponse(appId: string): string {
  const responses: Record<string, string> = {
    "poi-map":
      "Here's an interactive map with some great spots to check out. Tap any location for more details!",
    welcome:
      "I'd be happy to show you around! This is an interactive app that demonstrates the MCP Apps SDK.",
  };
  return (
    responses[appId] ??
    "Here's what I found. Let me know if you need anything else!"
  );
}

interface ChatThreadProps {
  children: ReactNode;
  className?: string;
}

export function ChatThread({ children, className }: ChatThreadProps) {
  const displayMode = useDisplayMode();
  const theme = useWorkbenchStore((s) => s.previewTheme);
  const deviceType = useDeviceType();
  const conversationMode = useConversationMode();
  const maxHeight = useWorkbenchStore((s) => s.maxHeight);
  const intrinsicHeight = useWorkbenchStore((s) => s.intrinsicHeight);
  const selectedComponent = useSelectedComponent();
  const mockConfig = useWorkbenchStore((s) => s.mockConfig);
  const effectiveIsDark = theme === "dark";
  const scrollRef = useRef<HTMLDivElement>(null);

  const widgetHeight =
    intrinsicHeight !== null
      ? Math.min(Math.max(intrinsicHeight, 0), maxHeight)
      : maxHeight;
  const isDesktopDevice = deviceType === "desktop";

  useEffect(() => {
    if (scrollRef.current && displayMode === "pip") {
      scrollRef.current.scrollTop = 0;
    }
  }, [displayMode]);

  useEffect(() => {
    if (displayMode === "fullscreen") {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";

      if (window.parent !== window) {
        const targetOrigin = document.referrer
          ? new URL(document.referrer).origin
          : window.location.origin;
        window.parent.postMessage(
          { type: "workbench:fullscreen", value: true },
          targetOrigin,
        );
      }

      return () => {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";

        if (window.parent !== window) {
          const targetOrigin = document.referrer
            ? new URL(document.referrer).origin
            : window.location.origin;
          window.parent.postMessage(
            { type: "workbench:fullscreen", value: false },
            targetOrigin,
          );
        }
      };
    }
  }, [displayMode]);

  const component = WORKBENCH_COMPONENTS_BY_ID.get(selectedComponent);
  const appId = component?.id ?? "app";
  const appName = component?.label ?? appId;
  const toolConfig = mockConfig.tools[appId];
  const activeVariant = toolConfig?.variants.find(
    (v) => v.id === toolConfig.activeVariantId,
  );
  const conversation: ConversationContext | undefined =
    activeVariant?.conversation;

  const userMessage = conversation?.userMessage ?? getDefaultUserMessage(appId);
  const assistantResponse =
    conversation?.assistantResponse ?? getDefaultAssistantResponse(appId);

  const layoutVariant = getLayoutVariant({ displayMode, conversationMode });
  const layout = getLayoutConfig({
    variant: layoutVariant,
    isDesktopDevice,
    isDark: effectiveIsDark,
    widgetHeight,
  });

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden transition-colors",
        className,
      )}
    >
      <div ref={scrollRef} className={layout.scrollContainerClassName}>
        <div className={layout.contentStackClassName}>
          {layout.showConversationContext && (
            <>
              <MessageBubble
                sender="user"
                content={userMessage}
                isDark={effectiveIsDark}
              />
              <AppIndicator
                appId={appId}
                appName={appName}
                isDark={effectiveIsDark}
              />
            </>
          )}

          <div className={layout.morphWrapperClassName}>
            <MorphContainer
              data-theme={theme}
              className={layout.morphContainerClassName}
              style={layout.morphContainerStyle}
            >
              <div className={layout.contentViewportClassName}>{children}</div>
            </MorphContainer>
          </div>

          {layout.showConversationContext && (
            <MessageBubble
              sender="assistant"
              content={assistantResponse}
              isDark={effectiveIsDark}
            />
          )}

          {layout.showPipMessages && (
            <div className="flex flex-col gap-3">
              <MessageList messages={MOCK_MESSAGES} isDark={effectiveIsDark} />
              <MessageList
                messages={MOCK_MESSAGES_AFTER}
                isDark={effectiveIsDark}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
