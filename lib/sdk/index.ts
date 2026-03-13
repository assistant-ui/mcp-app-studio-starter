export {
  UniversalProvider,
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
} from "mcp-app-studio";

export type {
  ChatMessage,
  ContentBlock,
  DisplayMode,
  HostContext,
  ImageContentBlock,
  Platform,
  TextContentBlock,
  Theme,
  ToolResult,
} from "mcp-app-studio/core";

export { imageBlock, textBlock } from "mcp-app-studio/core";
export {
  type CheckoutOutcome,
  type CheckoutRequest,
  requestCheckout,
  setOpenInAppUrl,
} from "./checkout";
export {
  type HostModalOptions,
  type OpenModalResult,
  openModal,
} from "./open-modal";
export { readToolResponseMetadata } from "./tool-response-metadata";
export { useWidgetState } from "./widget-state";
