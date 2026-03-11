"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Group,
  type GroupImperativeHandle,
  type Layout,
  Panel,
  Separator,
} from "react-resizable-panels";
import { useHydratedOnce } from "@/hooks/use-hydrated-once";
import { cn } from "@/lib/ui/cn";
import {
  useDeviceType,
  useDisplayMode,
  useIsTransitioning,
  useResizableWidth,
  useWorkbenchStore,
} from "@/lib/workbench/store";
import { DEVICE_PRESETS, type DeviceType } from "@/lib/workbench/types";
import { ChatThread } from "./chat-thread";
import { DeviceFrame } from "./device-frame";
import { IframeComponentContent } from "./iframe-component-content";
import { MockComposer } from "./mock-composer";

const PREVIEW_MIN_SIZE = 30;
const PREVIEW_MAX_SIZE = 100;
const RESIZABLE_MIN_WIDTH =
  typeof DEVICE_PRESETS.mobile.width === "number"
    ? DEVICE_PRESETS.mobile.width
    : 375;
const RESIZABLE_MAX_WIDTH = 1200;
const FRAME_VISIBILITY_THRESHOLD = 80;
const PREVIEW_PANEL_IDS = {
  leftSpacer: "preview-left-spacer",
  center: "preview-center",
  rightSpacer: "preview-right-spacer",
} as const;

const RESIZE_HANDLE_INDICATOR_CLASSES =
  "absolute top-1/2 left-1/2 h-14 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border opacity-60 transition-opacity duration-150 group-hover:opacity-100 group-data-[separator=active]:opacity-100";

function getSymmetricPreviewLayout(centerSize: number): Layout {
  const spacing = Math.max(0, (100 - centerSize) / 2);

  return {
    [PREVIEW_PANEL_IDS.leftSpacer]: spacing,
    [PREVIEW_PANEL_IDS.center]: centerSize,
    [PREVIEW_PANEL_IDS.rightSpacer]: spacing,
  };
}

function PreviewResizeHandle({
  isTransitioning,
  visible,
}: {
  isTransitioning: boolean;
  visible: boolean;
}) {
  return (
    <Separator
      disabled={!visible}
      className={cn(
        "group relative w-4 transition-opacity",
        visible
          ? cn(
              "opacity-0 duration-150 focus-visible:opacity-100 group-hover/preview:opacity-100 group-data-[separator=active]:opacity-100",
              isTransitioning && "opacity-0 duration-50",
            )
          : "pointer-events-none w-0 overflow-hidden opacity-0 duration-150",
      )}
    >
      <div className={RESIZE_HANDLE_INDICATOR_CLASSES} />
    </Separator>
  );
}

const WidgetContent = memo(function WidgetContent() {
  // MCP Apps UIs run in an iframe. The workbench always previews widgets in an
  // iframe so the runtime contract matches production.
  return <IframeComponentContent className="h-full" />;
});

function ChatWithComposer({
  appContainerClassName,
}: {
  appContainerClassName?: string;
}) {
  const displayMode = useDisplayMode();
  const isFullscreen = displayMode === "fullscreen";
  const composerVariant = isFullscreen ? "overlay" : "bottom";
  const widgetContent = useMemo(() => <WidgetContent />, []);

  return (
    <div
      className={cn("relative h-full w-full", !isFullscreen && "flex flex-col")}
    >
      <div
        className={cn(
          "relative",
          !isFullscreen ? "flex-1 overflow-hidden" : "h-full w-full",
          appContainerClassName,
        )}
      >
        <ChatThread>{widgetContent}</ChatThread>
      </div>
      <MockComposer variant={composerVariant} />
    </div>
  );
}

function shouldShowPreviewResizeHandles(deviceType: DeviceType): boolean {
  return deviceType === "resizable";
}

function shouldUsePreviewStage(
  deviceType: DeviceType,
  containerWidth: number,
): boolean {
  if (containerWidth <= 0) return false;
  if (deviceType === "resizable") return true;

  if (deviceType === "desktop") {
    const tabletWidth = DEVICE_PRESETS.tablet.width;
    return (
      typeof tabletWidth === "number" &&
      containerWidth > tabletWidth + FRAME_VISIBILITY_THRESHOLD
    );
  }

  const preset = DEVICE_PRESETS[deviceType];
  return (
    typeof preset.width === "number" &&
    containerWidth > preset.width + FRAME_VISIBILITY_THRESHOLD
  );
}

function resolvePreviewDeviceWidth(
  deviceType: DeviceType,
  resizableWidth: number,
): number {
  if (deviceType === "resizable") {
    return resizableWidth;
  }

  const preset = DEVICE_PRESETS[deviceType];
  return typeof preset.width === "number" ? preset.width : 0;
}

function clampResizablePreviewWidth(width: number): number {
  return Math.max(RESIZABLE_MIN_WIDTH, Math.min(RESIZABLE_MAX_WIDTH, width));
}

function PanelPreview() {
  const deviceType = useDeviceType();
  const displayMode = useDisplayMode();
  const isTransitioning = useIsTransitioning();
  const resizableWidth = useResizableWidth();
  const setResizableWidth = useWorkbenchStore((s) => s.setResizableWidth);
  const theme = useWorkbenchStore((s) => s.previewTheme);
  const hydrated = useHydratedOnce();
  const isDark = hydrated && theme === "dark";
  const panelGroupRef = useRef<GroupImperativeHandle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isSyncingLayout = useRef(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const showResizeHandles = shouldShowPreviewResizeHandles(deviceType);
  const isDesktop = deviceType === "desktop";
  const deviceWidth = resolvePreviewDeviceWidth(deviceType, resizableWidth);
  const showFramedDevice =
    showResizeHandles ||
    (!isDesktop &&
      containerWidth > 0 &&
      containerWidth > deviceWidth + FRAME_VISIBILITY_THRESHOLD);
  const showPreviewStage = shouldUsePreviewStage(deviceType, containerWidth);
  const rootTone = !hydrated
    ? "bg-background"
    : isDark
      ? "bg-neutral-900"
      : "bg-white";
  const framedStageTone = !hydrated
    ? "bg-background"
    : isDark
      ? "bg-neutral-900"
      : "bg-neutral-100";

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setContainerWidth(container.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!panelGroupRef.current || containerWidth <= 0) return;

    const targetWidth = showResizeHandles
      ? resizableWidth + 32
      : showFramedDevice
        ? deviceWidth + 32
        : containerWidth;
    const minCenterSize = showResizeHandles ? PREVIEW_MIN_SIZE : 0;
    const centerSize = Math.min(
      PREVIEW_MAX_SIZE,
      Math.max(minCenterSize, (targetWidth / containerWidth) * 100),
    );

    isSyncingLayout.current = true;
    panelGroupRef.current.setLayout(getSymmetricPreviewLayout(centerSize));
  }, [
    containerWidth,
    deviceWidth,
    resizableWidth,
    showFramedDevice,
    showResizeHandles,
  ]);

  const handleLayout = useCallback(
    (sizes: Layout) => {
      if (!showResizeHandles) return;
      if (!panelGroupRef.current || !containerRef.current) return;
      if (isSyncingLayout.current) {
        isSyncingLayout.current = false;
        return;
      }

      const left = sizes[PREVIEW_PANEL_IDS.leftSpacer] ?? 0;
      const center = sizes[PREVIEW_PANEL_IDS.center] ?? 0;
      const right = sizes[PREVIEW_PANEL_IDS.rightSpacer] ?? 0;
      const clampedCenter = Math.min(
        PREVIEW_MAX_SIZE,
        Math.max(PREVIEW_MIN_SIZE, center),
      );
      const symmetricLayout = getSymmetricPreviewLayout(clampedCenter);
      const spacing = symmetricLayout[PREVIEW_PANEL_IDS.leftSpacer];
      const epsilon = 0.5;

      const isSymmetric =
        Math.abs(left - spacing) < epsilon &&
        Math.abs(right - spacing) < epsilon &&
        Math.abs(center - clampedCenter) < epsilon;

      if (!isSymmetric) {
        isSyncingLayout.current = true;
        panelGroupRef.current.setLayout(symmetricLayout);
      }

      const containerWidth = containerRef.current.offsetWidth;
      const newWidth = Math.round((clampedCenter / 100) * containerWidth - 32);
      const clampedWidth = clampResizablePreviewWidth(newWidth);
      if (clampedWidth !== resizableWidth) {
        setResizableWidth(clampedWidth);
      }
    },
    [resizableWidth, setResizableWidth, showResizeHandles],
  );

  return (
    <div
      ref={containerRef}
      data-theme={theme}
      className={cn(
        "group/preview scrollbar-subtle h-full w-full overflow-hidden transition-colors",
        rootTone,
      )}
    >
      <Group
        groupRef={panelGroupRef}
        disabled={!showResizeHandles}
        orientation="horizontal"
        onLayoutChange={handleLayout}
        className={cn(
          "h-full w-full",
          showPreviewStage && "bg-dot-grid p-4",
          showPreviewStage ? framedStageTone : rootTone,
        )}
      >
        <Panel
          id={PREVIEW_PANEL_IDS.leftSpacer}
          defaultSize="0%"
          minSize="0%"
        />
        <PreviewResizeHandle
          isTransitioning={isTransitioning}
          visible={showResizeHandles}
        />
        <Panel
          id={PREVIEW_PANEL_IDS.center}
          defaultSize="100%"
          minSize={showResizeHandles ? `${PREVIEW_MIN_SIZE}%` : "0%"}
          maxSize={`${PREVIEW_MAX_SIZE}%`}
        >
          <div
            className={cn(
              "h-full w-full overflow-hidden transition-colors",
              showFramedDevice && "flex items-center justify-center",
            )}
          >
            <DeviceFrame
              framed={showFramedDevice}
              className={cn(showFramedDevice ? "max-h-full" : "h-full w-full")}
              style={
                showFramedDevice
                  ? {
                      width: deviceWidth,
                      height: "100%",
                    }
                  : undefined
              }
            >
              <ChatWithComposer
                appContainerClassName={
                  isDesktop && displayMode === "inline" ? "py-4" : undefined
                }
              />
            </DeviceFrame>
          </div>
        </Panel>
        <PreviewResizeHandle
          isTransitioning={isTransitioning}
          visible={showResizeHandles}
        />
        <Panel
          id={PREVIEW_PANEL_IDS.rightSpacer}
          defaultSize="0%"
          minSize="0%"
        />
      </Group>
    </div>
  );
}

export function PreviewContent() {
  return <PanelPreview />;
}
