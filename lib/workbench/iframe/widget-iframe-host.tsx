"use client";

import { PostMessageTransport } from "@modelcontextprotocol/ext-apps";
import { AppBridge } from "@modelcontextprotocol/ext-apps/app-bridge";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getFileUrl, storeFile } from "../file-store";
import { handleMockToolCall } from "../mock-responses";
import { useWorkbenchStore } from "../store";
import { MORPH_TIMING } from "../transition-config";
import type {
  CallToolResponse,
  DisplayMode,
  ModalOptions,
  OpenAIGlobals,
  WidgetState,
} from "../types";
import {
  generateEmptyIframeHtml,
  generateIframeHtml,
} from "./generate-iframe-html";
import {
  WorkbenchMessageBridge,
  type WorkbenchMessageHandlers,
} from "./workbench-message-bridge";

export interface WidgetIframeHostProps {
  widgetBundle: string | null;
  cssBundle?: string;
  className?: string;
  style?: CSSProperties;
  demoMode?: boolean;
}

function mapDeviceTypeToMcpPlatform(
  deviceType: OpenAIGlobals["userAgent"]["device"]["type"],
): "web" | "desktop" | "mobile" {
  if (deviceType === "mobile" || deviceType === "tablet") return "mobile";
  return "web";
}

function buildMcpHostContext(globals: OpenAIGlobals): Record<string, unknown> {
  return {
    theme: globals.theme,
    locale: globals.locale,
    displayMode: globals.displayMode,
    availableDisplayModes: ["pip", "inline", "fullscreen"],
    containerDimensions: { maxHeight: globals.maxHeight },
    platform: mapDeviceTypeToMcpPlatform(globals.userAgent.device.type),
    deviceCapabilities: globals.userAgent.capabilities,
    safeAreaInsets: globals.safeArea.insets,
    userAgent: "MCP App Studio Workbench",
  };
}

function toMcpToolResultParams(
  result: CallToolResponse,
): Record<string, unknown> {
  const content: Array<Record<string, unknown>> = [];
  if (typeof result.content === "string" && result.content.length > 0) {
    content.push({ type: "text", text: result.content });
  } else if (Array.isArray(result.content)) {
    for (const block of result.content) {
      if (!block || typeof block !== "object") continue;
      const type = (block as any).type;
      const text = (block as any).text;
      if (type === "text" && typeof text === "string") {
        content.push({ type: "text", text });
      }
    }
  }

  const params: Record<string, unknown> = { content };
  if (result.structuredContent !== undefined) {
    params.structuredContent = result.structuredContent;
  }
  if (result.isError !== undefined) {
    params.isError = result.isError;
  }
  if (result._meta) {
    params._meta = result._meta;
  }
  return params;
}

export function WidgetIframeHost({
  widgetBundle,
  cssBundle,
  className,
  style,
  demoMode = false,
}: WidgetIframeHostProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<WorkbenchMessageBridge | null>(null);
  const mcpBridgeRef = useRef<AppBridge | null>(null);
  const mcpInitializedRef = useRef(false);
  const store = useWorkbenchStore();
  const reducedMotion = useReducedMotion();
  const [iframeKey, setIframeKey] = useState(0);

  const globals = useMemo<OpenAIGlobals>(
    () => store.getOpenAIGlobals(),
    [store],
  );
  const globalsRef = useRef(globals);
  globalsRef.current = globals;

  const handleCallTool = useCallback(
    async (
      name: string,
      args: Record<string, unknown>,
    ): Promise<CallToolResponse> => {
      store.addConsoleEntry({
        type: "callTool",
        method: `callTool("${name}")`,
        args,
      });

      store.registerSimTool(name);
      const { simulation } = store;
      const simConfig = simulation.tools[name];

      if (simConfig) {
        store.setActiveToolCall({
          toolName: name,
          delay: 300,
          startTime: Date.now(),
        });

        if (simConfig.responseMode === "hang") {
          store.addConsoleEntry({
            type: "callTool",
            method: `callTool("${name}") → [SIMULATED: hang]`,
            result: {
              _note: "Response withheld to test loading state (30s timeout)",
            },
          });

          const HANG_TIMEOUT_MS = 30000;

          return new Promise<CallToolResponse>((_resolve, reject) => {
            let cancelled = false;

            const timeoutId = setTimeout(() => {
              if (cancelled) return;
              store.setActiveToolCall(null);
              store.addConsoleEntry({
                type: "callTool",
                method: `callTool("${name}") → [SIMULATED: hang timeout]`,
                result: { _note: "Hang simulation timed out after 30 seconds" },
              });
              reject(new Error("Simulated hang timed out after 30 seconds"));
            }, HANG_TIMEOUT_MS);

            const cancelFn = () => {
              cancelled = true;
              clearTimeout(timeoutId);
              store.addConsoleEntry({
                type: "callTool",
                method: `callTool("${name}") → [SIMULATED: hang cancelled]`,
                result: { _note: "Hang simulation cancelled by user" },
              });
              reject(new Error("Hang simulation cancelled"));
            };

            store.setActiveToolCall({
              toolName: name,
              delay: HANG_TIMEOUT_MS,
              startTime: Date.now(),
              isHanging: true,
              cancelFn,
            });
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
        store.setActiveToolCall(null);

        let result: CallToolResponse;
        const modeLabel = simConfig.responseMode.toUpperCase();

        // ChatGPT/workbench compatibility metadata:
        // `openai/*` keys are **not** part of the MCP Apps standard; the workbench
        // uses them to correlate events with a preview session and to simulate
        // host-driven actions like closing the widget.
        switch (simConfig.responseMode) {
          case "error":
            result = {
              isError: true,
              content:
                (simConfig.responseData.message as string) ?? "Simulated error",
              _meta: { "openai/widgetSessionId": store.widgetSessionId },
            };
            break;
          default:
            result = {
              structuredContent: simConfig.responseData,
              _meta: { "openai/widgetSessionId": store.widgetSessionId },
            };
            break;
        }

        store.addConsoleEntry({
          type: "callTool",
          method: `callTool("${name}") → [SIMULATED: ${modeLabel}]`,
          result,
        });

        store.setToolOutput(result.structuredContent ?? null);
        store.setToolResponseMetadata(result._meta ?? null);

        if (result._meta?.["openai/closeWidget"] === true) {
          store.setWidgetClosed(true);
        }

        return result;
      }

      if (!store.mockConfig.tools[name]) {
        store.registerTool(name);
      }

      const toolConfig = store.mockConfig.tools[name];
      const activeVariant =
        store.mockConfig.globalEnabled && toolConfig?.activeVariantId
          ? toolConfig.variants.find((v) => v.id === toolConfig.activeVariantId)
          : null;
      const delay = activeVariant?.delay ?? 300;

      store.setActiveToolCall({
        toolName: name,
        delay,
        startTime: Date.now(),
      });

      let result;
      try {
        result = await handleMockToolCall(name, args, store.mockConfig);
      } finally {
        store.setActiveToolCall(null);
      }

      // ChatGPT/workbench compatibility metadata (see comment above).
      const enrichedMeta = {
        ...(result._meta ?? {}),
        "openai/widgetSessionId": store.widgetSessionId,
      };

      const enrichedResult: CallToolResponse = {
        ...result,
        _meta: enrichedMeta,
      };

      const methodLabel = result._mockVariant
        ? `callTool("${name}") → [MOCK: ${result._mockVariant}]`
        : `callTool("${name}") → response`;

      store.addConsoleEntry({
        type: "callTool",
        method: methodLabel,
        result: enrichedResult,
      });

      store.setToolOutput(enrichedResult.structuredContent ?? null);
      store.setToolResponseMetadata(enrichedResult._meta ?? null);

      if (enrichedResult._meta?.["openai/closeWidget"] === true) {
        store.setWidgetClosed(true);
      }

      return enrichedResult;
    },
    [store],
  );

  const handleSetWidgetState = useCallback(
    (state: WidgetState): void => {
      store.addConsoleEntry({
        type: "setWidgetState",
        method: "setWidgetState",
        args: state,
      });
      store.setWidgetState(state);
    },
    [store],
  );

  const handleRequestDisplayMode = useCallback(
    async (args: { mode: DisplayMode }): Promise<{ mode: DisplayMode }> => {
      const currentMode = store.displayMode;

      store.addConsoleEntry({
        type: "requestDisplayMode",
        method: `requestDisplayMode("${args.mode}")`,
        args,
      });

      if (currentMode === args.mode) {
        return { mode: args.mode };
      }

      if (store.isTransitioning) {
        return { mode: args.mode };
      }

      if (
        reducedMotion ||
        typeof document === "undefined" ||
        !("startViewTransition" in document)
      ) {
        store.setDisplayMode(args.mode);
        return { mode: args.mode };
      }

      store.setTransitioning(true);

      const toFullscreen = args.mode === "fullscreen";
      const root = document.documentElement;
      root.style.setProperty(
        "--morph-radius-from",
        toFullscreen ? "0.75rem" : "0",
      );
      root.style.setProperty(
        "--morph-radius-to",
        toFullscreen ? "0" : "0.75rem",
      );

      (
        document as Document & {
          startViewTransition: (callback: () => void) => void;
        }
      ).startViewTransition(() => {
        store.setDisplayMode(args.mode);
      });

      setTimeout(() => {
        store.setTransitioning(false);
        root.style.removeProperty("--morph-radius-from");
        root.style.removeProperty("--morph-radius-to");
      }, MORPH_TIMING.viewTransitionDuration);

      return { mode: args.mode };
    },
    [store, reducedMotion],
  );

  const handleSendFollowUpMessage = useCallback(
    async (args: { prompt: string }): Promise<void> => {
      store.addConsoleEntry({
        type: "sendFollowUpMessage",
        method: "sendFollowUpMessage",
        args,
      });
    },
    [store],
  );

  const handleRequestClose = useCallback(() => {
    store.addConsoleEntry({
      type: "requestClose",
      method: "requestClose",
    });
    store.setWidgetClosed(true);
  }, [store]);

  const handleOpenExternal = useCallback(
    (payload: { href: string }) => {
      store.addConsoleEntry({
        type: "openExternal",
        method: `openExternal("${payload.href}")`,
        args: payload,
      });
      window.open(payload.href, "_blank", "noopener,noreferrer");
    },
    [store],
  );

  const handleNotifyIntrinsicHeight = useCallback(
    (height: number) => {
      store.addConsoleEntry({
        type: "notifyIntrinsicHeight",
        method: `notifyIntrinsicHeight(${height})`,
        args: { height },
      });
      const nextHeight = Number.isFinite(height) ? Math.max(0, height) : null;
      store.setIntrinsicHeight(nextHeight);
    },
    [store],
  );

  const handleRequestModal = useCallback(
    async (options: ModalOptions): Promise<void> => {
      store.addConsoleEntry({
        type: "requestModal",
        method: `requestModal("${options.title ?? "Modal"}")`,
        args: options,
      });

      store.setView({
        mode: "modal",
        params: options.params ?? null,
      });
    },
    [store],
  );

  const handleUploadFile = useCallback(
    async (file: File) => {
      const fileId = storeFile(file);

      store.addConsoleEntry({
        type: "uploadFile",
        method: `uploadFile("${file.name}")`,
        args: { name: file.name, size: file.size, type: file.type },
        result: { fileId },
      });

      return { fileId };
    },
    [store],
  );

  const handleGetFileDownloadUrl = useCallback(
    async (args: { fileId: string }) => {
      const downloadUrl = getFileUrl(args.fileId);

      store.addConsoleEntry({
        type: "getFileDownloadUrl",
        method: `getFileDownloadUrl("${args.fileId}")`,
        args,
        result: downloadUrl ? { downloadUrl } : { error: "File not found" },
      });

      if (!downloadUrl) {
        throw new Error(`File not found: ${args.fileId}`);
      }

      return { downloadUrl };
    },
    [store],
  );

  const handlers = useMemo<WorkbenchMessageHandlers>(
    () => ({
      callTool: handleCallTool,
      setWidgetState: handleSetWidgetState,
      requestDisplayMode: handleRequestDisplayMode,
      sendFollowUpMessage: handleSendFollowUpMessage,
      requestClose: handleRequestClose,
      openExternal: handleOpenExternal,
      notifyIntrinsicHeight: handleNotifyIntrinsicHeight,
      requestModal: handleRequestModal,
      uploadFile: handleUploadFile,
      getFileDownloadUrl: handleGetFileDownloadUrl,
    }),
    [
      handleCallTool,
      handleSetWidgetState,
      handleRequestDisplayMode,
      handleSendFollowUpMessage,
      handleRequestClose,
      handleOpenExternal,
      handleNotifyIntrinsicHeight,
      handleRequestModal,
      handleUploadFile,
      handleGetFileDownloadUrl,
    ],
  );
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const srcdoc = useMemo(() => {
    if (!widgetBundle) {
      return generateEmptyIframeHtml(
        globals,
        true,
        true,
        demoMode ? "/workbench-bundles/demo.css" : undefined,
      );
    }
    return generateIframeHtml({
      widgetBundle,
      cssBundle,
      cssHref: demoMode ? "/workbench-bundles/demo.css" : undefined,
      initialGlobals: globals,
      useTailwindCdn: !demoMode,
      includeOpenAIShim: true,
    });
  }, [widgetBundle, cssBundle, globals, demoMode]);

  useLayoutEffect(() => {
    if (demoMode) {
      mcpInitializedRef.current = false;
      mcpBridgeRef.current = null;
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    let cancelled = false;
    mcpInitializedRef.current = false;

    const bridge = new AppBridge(
      null,
      { name: "mcp-app-studio-workbench", version: "0.0.0" },
      {
        openLinks: {},
        serverTools: {},
        logging: {},
        // Support sending follow-up messages + model context updates from the view.
        message: { text: {}, structuredContent: {} },
        updateModelContext: { text: {}, structuredContent: {} },
      },
      { hostContext: buildMcpHostContext(globalsRef.current) as any },
    );

    mcpBridgeRef.current = bridge;

    bridge.onsizechange = ({ height }) => {
      // Mirrors the legacy `window.openai.notifyIntrinsicHeight(height)` behavior.
      const nextHeight =
        typeof height === "number" && Number.isFinite(height)
          ? Math.max(0, height)
          : null;
      store.setIntrinsicHeight(nextHeight);
    };

    bridge.onloggingmessage = ({ level, logger, data }) => {
      store.addConsoleEntry({
        type: "event",
        method: `notifications/message (${logger ?? "widget"})`,
        args: { level, data },
      });
    };

    bridge.onopenlink = async ({ url }) => {
      handleOpenExternal({ href: url });
      return {};
    };

    bridge.onrequestdisplaymode = async ({ mode }) => {
      return handleRequestDisplayMode({ mode: mode as DisplayMode });
    };

    bridge.onmessage = async ({ role, content }) => {
      store.addConsoleEntry({
        type: "event",
        method: "ui/message",
        args: { role, content },
      });
      return {};
    };

    bridge.onupdatemodelcontext = async ({ content, structuredContent }) => {
      store.addConsoleEntry({
        type: "event",
        method: "ui/update-model-context",
        args: { content, structuredContent },
      });
      return {};
    };

    bridge.oncalltool = async (params) => {
      const name = params.name as string;
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      const result = await handleCallTool(name, args);
      return toMcpToolResultParams(result) as any;
    };

    bridge.oninitialized = () => {
      if (cancelled) return;
      mcpInitializedRef.current = true;
      void bridge.sendToolInput({ arguments: globalsRef.current.toolInput });
      if (globalsRef.current.toolOutput) {
        void bridge.sendToolResult(
          toMcpToolResultParams({
            structuredContent: globalsRef.current.toolOutput,
            _meta: globalsRef.current.toolResponseMetadata ?? undefined,
          }) as any,
        );
      }
    };

    const transport = new PostMessageTransport(
      iframe.contentWindow,
      iframe.contentWindow,
    );

    bridge.connect(transport).catch((error) => {
      if (cancelled) return;
      console.error("[workbench] MCP host bridge connect failed:", error);
    });

    return () => {
      cancelled = true;
      mcpInitializedRef.current = false;
      mcpBridgeRef.current = null;
      void bridge.close();
    };
  }, [
    demoMode,
    iframeKey,
    handleCallTool,
    handleOpenExternal,
    handleRequestDisplayMode,
    store,
  ]);

  useEffect(() => {
    bridgeRef.current?.setHandlers(handlers);
  }, [handlers]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const bridge = new WorkbenchMessageBridge(handlersRef.current);
    bridgeRef.current = bridge;
    let attached = false;

    function handleLoad() {
      const currentIframe = iframeRef.current;
      if (!currentIframe) return;
      if (!attached) {
        bridge.attach(currentIframe);
        attached = true;
      }
      bridge.sendGlobals(globalsRef.current);
    }

    iframe.addEventListener("load", handleLoad);
    if (iframe.contentWindow) {
      handleLoad();
    }

    return () => {
      iframe.removeEventListener("load", handleLoad);
      bridge.detach();
      bridgeRef.current = null;
    };
  }, [iframeKey]);

  useEffect(() => {
    if (bridgeRef.current) {
      bridgeRef.current.sendGlobals(globals);
    }
  }, [globals]);

  useEffect(() => {
    const bridge = mcpBridgeRef.current;
    if (!bridge) return;
    bridge.setHostContext(buildMcpHostContext(globals) as any);
  }, [
    globals.theme,
    globals.locale,
    globals.displayMode,
    globals.maxHeight,
    globals.safeArea,
    globals.userAgent,
  ]);

  useEffect(() => {
    const bridge = mcpBridgeRef.current;
    if (!bridge || !mcpInitializedRef.current) return;
    void bridge.sendToolInput({ arguments: globals.toolInput });
  }, [globals.toolInput]);

  useEffect(() => {
    const bridge = mcpBridgeRef.current;
    if (!bridge || !mcpInitializedRef.current) return;
    if (!globals.toolOutput) return;

    void bridge.sendToolResult(
      toMcpToolResultParams({
        structuredContent: globals.toolOutput,
        _meta: globals.toolResponseMetadata ?? undefined,
      }) as any,
    );
  }, [globals.toolOutput, globals.toolResponseMetadata]);

  useEffect(() => {
    setIframeKey((k) => k + 1);
  }, [widgetBundle, cssBundle]);

  return (
    <iframe
      key={iframeKey}
      ref={iframeRef}
      srcDoc={srcdoc}
      className={className}
      style={{
        border: "none",
        width: "100%",
        height: "100%",
        ...style,
      }}
      sandbox="allow-scripts allow-same-origin"
      title="Widget Preview"
    />
  );
}
