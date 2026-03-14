"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Group,
  Panel,
  type PanelImperativeHandle,
  type PanelSize,
  Separator,
  useDefaultLayout,
} from "react-resizable-panels";
import { cn } from "@/lib/ui/cn";
import { PANEL_AUTO_SAVE_IDS } from "@/lib/workbench/persistence";
import {
  useIsLeftPanelOpen,
  useIsRightPanelOpen,
  useWorkbenchStore,
} from "@/lib/workbench/store";
import { ActivityPanel } from "./activity-panel";
import { EditorPanel } from "./editor-panel";
import { PreviewPanel } from "./preview-panel";

const HANDLE_CLASSES = "group relative w-4 shrink-0";

const HIGHLIGHT_CLASSES =
  "absolute inset-y-0 w-px bg-linear-to-b from-transparent via-neutral-300 to-transparent opacity-0 group-hover:opacity-100 group-data-[separator=active]:opacity-100 dark:via-neutral-500 transition-opacity duration-150";

const WORKSPACE_GROUP_ID = PANEL_AUTO_SAVE_IDS.WORKSPACE_HORIZONTAL;
const LEFT_PANEL_ID = "workbench-left-panel";
const PREVIEW_PANEL_ID = "workbench-preview-panel";
const RIGHT_PANEL_ID = "workbench-right-panel";

const DEFAULT_SIDE_PANEL_SIZE = "25%";
const DEFAULT_PREVIEW_PANEL_SIZE = "50%";
const SIDE_PANEL_COLLAPSED_SIZE = "0%";
const SIDE_PANEL_MIN_SIZE = "20%";
const SIDE_PANEL_MAX_SIZE = "40%";
const PREVIEW_PANEL_MIN_SIZE = "30%";
const COLLAPSED_PERCENTAGE_EPSILON = 0.5;

function isWorkbenchPanelCollapsed(
  panelSize: Pick<PanelSize, "asPercentage">,
): boolean {
  return panelSize.asPercentage <= COLLAPSED_PERCENTAGE_EPSILON;
}

export function WorkbenchLayout() {
  const leftPanelRef = useRef<PanelImperativeHandle | null>(null);
  const rightPanelRef = useRef<PanelImperativeHandle | null>(null);

  const isLeftPanelOpen = useIsLeftPanelOpen();
  const isRightPanelOpen = useIsRightPanelOpen();
  const setLeftPanelOpen = useWorkbenchStore((s) => s.setLeftPanelOpen);
  const setRightPanelOpen = useWorkbenchStore((s) => s.setRightPanelOpen);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: WORKSPACE_GROUP_ID,
    panelIds: [LEFT_PANEL_ID, PREVIEW_PANEL_ID, RIGHT_PANEL_ID],
  });

  useEffect(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;

    if (isLeftPanelOpen && panel.isCollapsed()) {
      panel.expand();
    } else if (!isLeftPanelOpen && !panel.isCollapsed()) {
      panel.collapse();
    }
  }, [isLeftPanelOpen]);

  useEffect(() => {
    const panel = rightPanelRef.current;
    if (!panel) return;

    if (isRightPanelOpen && panel.isCollapsed()) {
      panel.expand();
    } else if (!isRightPanelOpen && !panel.isCollapsed()) {
      panel.collapse();
    }
  }, [isRightPanelOpen]);

  const handleLeftPanelResize = useCallback(
    (
      size: PanelSize,
      _panelId: string | number | undefined,
      prevSize?: PanelSize,
    ) => {
      if (!prevSize) return;

      const isCollapsed = isWorkbenchPanelCollapsed(size);
      const wasCollapsed = isWorkbenchPanelCollapsed(prevSize);
      if (isCollapsed !== wasCollapsed) {
        setLeftPanelOpen(!isCollapsed);
      }
    },
    [setLeftPanelOpen],
  );

  const handleRightPanelResize = useCallback(
    (
      size: PanelSize,
      _panelId: string | number | undefined,
      prevSize?: PanelSize,
    ) => {
      if (!prevSize) return;

      const isCollapsed = isWorkbenchPanelCollapsed(size);
      const wasCollapsed = isWorkbenchPanelCollapsed(prevSize);
      if (isCollapsed !== wasCollapsed) {
        setRightPanelOpen(!isCollapsed);
      }
    },
    [setRightPanelOpen],
  );

  return (
    <Group
      id={WORKSPACE_GROUP_ID}
      orientation="horizontal"
      className="relative flex h-full w-full flex-row"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
    >
      <Panel
        id={LEFT_PANEL_ID}
        panelRef={leftPanelRef}
        collapsible
        defaultSize={DEFAULT_SIDE_PANEL_SIZE}
        minSize={SIDE_PANEL_MIN_SIZE}
        collapsedSize={SIDE_PANEL_COLLAPSED_SIZE}
        maxSize={SIDE_PANEL_MAX_SIZE}
        onResize={handleLeftPanelResize}
      >
        <EditorPanel />
      </Panel>

      <Separator
        className={cn(
          HANDLE_CLASSES,
          "z-80 h-full w-0",
          isLeftPanelOpen ? "cursor-ew-resize" : "cursor-e-resize!",
        )}
        onClick={() => !isLeftPanelOpen && setLeftPanelOpen(true)}
        onDoubleClick={() =>
          leftPanelRef.current?.resize(DEFAULT_SIDE_PANEL_SIZE)
        }
      >
        <div className={`${HIGHLIGHT_CLASSES} absolute left-0 z-20`} />
      </Separator>

      <Panel
        id={PREVIEW_PANEL_ID}
        defaultSize={DEFAULT_PREVIEW_PANEL_SIZE}
        minSize={PREVIEW_PANEL_MIN_SIZE}
      >
        <div
          className={cn(
            "block h-full py-4 pt-0",
            !isLeftPanelOpen && "pl-4",
            !isRightPanelOpen && "pr-4",
          )}
        >
          <PreviewPanel />
        </div>
      </Panel>

      <Separator
        className={cn(
          HANDLE_CLASSES,
          "z-20 h-full w-0",
          isRightPanelOpen ? "cursor-ew-resize" : "cursor-w-resize!",
        )}
        onClick={() => !isRightPanelOpen && setRightPanelOpen(true)}
        onDoubleClick={() =>
          rightPanelRef.current?.resize(DEFAULT_SIDE_PANEL_SIZE)
        }
      >
        <div className={`${HIGHLIGHT_CLASSES} absolute -left-px z-20`} />
      </Separator>

      <Panel
        id={RIGHT_PANEL_ID}
        panelRef={rightPanelRef}
        collapsible
        defaultSize={DEFAULT_SIDE_PANEL_SIZE}
        minSize={SIDE_PANEL_MIN_SIZE}
        collapsedSize={SIDE_PANEL_COLLAPSED_SIZE}
        maxSize={SIDE_PANEL_MAX_SIZE}
        onResize={handleRightPanelResize}
      >
        <ActivityPanel />
      </Panel>
    </Group>
  );
}
