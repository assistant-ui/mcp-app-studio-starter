"use client";

import { ChevronDown, RotateCcw } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/ui/cn";
import { getComponent } from "@/lib/workbench/component-registry";
import { useSelectedComponent, useWorkbenchStore } from "@/lib/workbench/store";
import {
  resolveEditableWidgetState,
  resolveResetWidgetState,
} from "@/lib/workbench/widget-state-editor";
import { JsonEditor } from "./json-editor";
import { useJsonEditorChannel } from "./json-editor-state";

type JsonEditorTab = "toolInput" | "toolOutput" | "widgetState";

type EditorSectionKey = "toolInput" | "widgetState";

interface EditorSectionConfig {
  key: EditorSectionKey;
  title: string;
  tooltip: string;
  tab: JsonEditorTab;
}

const EDITOR_SECTIONS: EditorSectionConfig[] = [
  {
    key: "toolInput",
    title: "App Props",
    tooltip:
      "Data passed to your app when a tool is called. Edit to test different inputs.",
    tab: "toolInput",
  },
  {
    key: "widgetState",
    title: "Host State",
    tooltip:
      "Optional host-managed state exposed by the host. In ChatGPT this maps to widgetState. This is not part of standard MCP Apps.",
    tab: "widgetState",
  },
];

function useJsonEditorState() {
  const selectedComponent = useSelectedComponent();

  const { toolInput, widgetState, setToolInput, setWidgetState } =
    useWorkbenchStore(
      useShallow((s) => ({
        toolInput: s.toolInput,
        widgetState: s.widgetState,
        setToolInput: s.setToolInput,
        setWidgetState: s.setWidgetState,
      })),
    );

  const toolInputController = useJsonEditorChannel({
    label: "App Props",
    value: toolInput,
    onApply: setToolInput,
  });
  const widgetStateController = useJsonEditorChannel({
    label: "Host State",
    value: resolveEditableWidgetState(
      (widgetState as Record<string, unknown> | null) ?? null,
    ),
    onApply: (value) =>
      setWidgetState(Object.keys(value).length === 0 ? null : value),
  });

  const controllers = {
    toolInput: toolInputController,
    widgetState: widgetStateController,
  } as const;

  const handleReset = (tab: JsonEditorTab) => {
    switch (tab) {
      case "toolInput": {
        const nextValue = getComponent(selectedComponent)?.defaultProps ?? {};
        setToolInput(nextValue);
        controllers.toolInput.resetToValue(nextValue);
        break;
      }
      case "widgetState": {
        const resetWidgetState = resolveResetWidgetState();
        const nextEditableWidgetState =
          resolveEditableWidgetState(resetWidgetState);

        setWidgetState(resetWidgetState);
        controllers.widgetState.resetToValue(nextEditableWidgetState);
        break;
      }
      case "toolOutput":
        break;
    }
  };

  return { controllers, handleReset };
}

interface EditorSectionTriggerProps {
  title: string;
  badge?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  action?: ReactNode;
}

function EditorSectionTrigger({
  title,
  badge,
  isOpen,
  onToggle,
  action,
}: EditorSectionTriggerProps) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between gap-2 px-3 transition-colors hover:bg-muted/30">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-full flex-1 items-center gap-1.5 text-left"
      >
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-100 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isOpen ? "rotate-0" : "-rotate-90",
          )}
        />
        <span className="mr-1 font-normal text-muted-foreground text-sm">
          {title}
        </span>

        {badge}
      </button>
      {action}
    </div>
  );
}

interface EditorSectionContentProps {
  isOpen: boolean;
  children: ReactNode;
}

function EditorSectionContent({ isOpen, children }: EditorSectionContentProps) {
  if (!isOpen) {
    return <div className="border-b" />;
  }

  return (
    <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto border-b">
      {children}
    </div>
  );
}

interface WidgetStateSectionProps {
  text: string;
  invalidMessage: string | null;
  onChange: (text: string) => void;
}

function WidgetStateSection({
  text,
  invalidMessage,
  onChange,
}: WidgetStateSectionProps) {
  return (
    <div>
      <div className="px-3 pt-3 text-[11px] text-muted-foreground leading-relaxed">
        {/* Host state is an OpenAI-specific override layer, not the app's full
            runtime state. Keep this panel raw so it doesn't drift from real host semantics. */}
        Edits host-managed widget state only. Empty means no persisted host
        override. Your app may still derive runtime state from App Props,
        built-in defaults, local storage, or server data.
      </div>
      <JsonEditor
        label="Host State"
        text={text}
        invalidMessage={invalidMessage}
        onChange={onChange}
      />
    </div>
  );
}

export function EditorPanel() {
  const { controllers, handleReset } = useJsonEditorState();
  const [openSections, setOpenSections] = useState<
    Record<EditorSectionKey, boolean>
  >({
    toolInput: true,
    widgetState: false,
  });

  const toggleSection = (key: EditorSectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderSectionContent = (section: EditorSectionConfig) => {
    const controller = controllers[section.key];
    if (section.key === "widgetState") {
      return (
        <WidgetStateSection
          text={controller.text}
          invalidMessage={controller.invalidMessage}
          onChange={controller.handleTextChange}
        />
      );
    }
    return (
      <JsonEditor
        label={section.title}
        text={controller.text}
        invalidMessage={controller.invalidMessage}
        onChange={controller.handleTextChange}
      />
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden pt-6 pb-8">
      {EDITOR_SECTIONS.map((section) => (
        <div key={section.key} className="contents">
          <EditorSectionTrigger
            title={section.title}
            badge={
              section.key === "widgetState" ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
                      ChatGPT
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-56 text-xs">
                    {section.tooltip}
                  </TooltipContent>
                </Tooltip>
              ) : undefined
            }
            isOpen={openSections[section.key]}
            onToggle={() => toggleSection(section.key)}
            action={
              openSections[section.key] ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReset(section.tab);
                      }}
                    >
                      <RotateCcw className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Reset</TooltipContent>
                </Tooltip>
              ) : null
            }
          />
          <EditorSectionContent isOpen={openSections[section.key]}>
            {renderSectionContent(section)}
          </EditorSectionContent>
        </div>
      ))}
    </div>
  );
}
