import {
  DEVICE_PRESETS,
  type DeviceType,
  type DisplayMode,
} from "@/lib/workbench/types";

const RESIZABLE_MIN_WIDTH =
  typeof DEVICE_PRESETS.mobile.width === "number"
    ? DEVICE_PRESETS.mobile.width
    : 375;
const RESIZABLE_MAX_WIDTH = 1200;

export const FRAME_VISIBILITY_THRESHOLD = 80;

export function shouldShowPreviewResizeHandles(
  deviceType: DeviceType,
): boolean {
  return deviceType === "resizable";
}

export function shouldUsePreviewStage(
  displayMode: DisplayMode,
  deviceType: DeviceType,
  containerWidth: number,
): boolean {
  if (displayMode === "fullscreen") return false;
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

export function resolvePreviewDeviceWidth(
  deviceType: DeviceType,
  resizableWidth: number,
): number {
  if (deviceType === "resizable") {
    return resizableWidth;
  }

  const preset = DEVICE_PRESETS[deviceType];
  return typeof preset.width === "number" ? preset.width : 0;
}

export function clampResizablePreviewWidth(width: number): number {
  return Math.max(RESIZABLE_MIN_WIDTH, Math.min(RESIZABLE_MAX_WIDTH, width));
}
