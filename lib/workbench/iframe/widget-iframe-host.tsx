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
import { flushSync } from "react-dom";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { clearFiles, getFileUrl, storeFile } from "../file-store";
import { callMcpTool } from "../mcp-client";
import { handleMockToolCall } from "../mock-responses";
import { useOpenAIGlobals, useWorkbenchStore } from "../store";
import {
  type CallToolResponse,
  type CheckoutRequest,
  type CheckoutResult,
  DEFAULT_TOOL_CONFIG,
  type DisplayMode,
  type ModalOptions,
  type OpenAIGlobals,
  type ToolSimulationConfig,
  type WidgetState,
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
  hmrSrc?: string | null;
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
    theme: globals.previewTheme || globals.theme,
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

function buildToolResultBridgePayload(
  toolOutput: Record<string, unknown> | null,
  toolResponseMetadata: Record<string, unknown> | null,
): CallToolResponse | null {
  if (toolOutput === null && toolResponseMetadata === null) {
    return null;
  }

  return {
    ...(toolOutput !== null ? { structuredContent: toolOutput } : {}),
    ...(toolResponseMetadata !== null ? { _meta: toolResponseMetadata } : {}),
  };
}

const DEFAULT_SIMULATION_RESPONSE_DATA = JSON.stringify(
  DEFAULT_TOOL_CONFIG.responseData,
);

function hasCustomSimulationConfig(config?: ToolSimulationConfig): boolean {
  if (!config) return false;
  if (config.responseMode !== DEFAULT_TOOL_CONFIG.responseMode) return true;
  return (
    JSON.stringify(config.responseData) !== DEFAULT_SIMULATION_RESPONSE_DATA
  );
}

export function WidgetIframeHost({
  widgetBundle,
  hmrSrc,
  cssBundle,
  className,
  style,
  demoMode = false,
}: WidgetIframeHostProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<WorkbenchMessageBridge | null>(null);
  const mcpBridgeRef = useRef<AppBridge | null>(null);
  const mcpInitializedRef = useRef(false);
  const reducedMotion = useReducedMotion();
  const [iframeKey, setIframeKey] = useState(0);
  const globals = useOpenAIGlobals();
  const addConsoleEntry = useWorkbenchStore((s) => s.addConsoleEntry);
  const registerTool = useWorkbenchStore((s) => s.registerTool);
  const setToolOutput = useWorkbenchStore((s) => s.setToolOutput);
  const setToolResponseMetadata = useWorkbenchStore(
    (s) => s.setToolResponseMetadata,
  );
  const setWidgetClosed = useWorkbenchStore((s) => s.setWidgetClosed);
  const setActiveToolCall = useWorkbenchStore((s) => s.setActiveToolCall);
  const setWidgetState = useWorkbenchStore((s) => s.setWidgetState);
  const setDisplayMode = useWorkbenchStore((s) => s.setDisplayMode);
  const setTransitioning = useWorkbenchStore((s) => s.setTransitioning);
  const setIntrinsicHeight = useWorkbenchStore((s) => s.setIntrinsicHeight);
  const setView = useWorkbenchStore((s) => s.setView);
  const globalsRef = useRef(globals);
  const openInAppUrlRef = useRef<string | null>(null);
  globalsRef.current = globals;

  const handleCallTool = useCallback(
    async (
      name: string,
      args: Record<string, unknown>,
    ): Promise<CallToolResponse> => {
      const currentState = useWorkbenchStore.getState();
      openInAppUrlRef.current = null;

      addConsoleEntry({
        type: "callTool",
        method: `callTool("${name}")`,
        args,
      });

      if (!currentState.mockConfig.tools[name]) {
        registerTool(name);
      }

      const toolConfig =
        useWorkbenchStore.getState().mockConfig.tools[name] ??
        currentState.mockConfig.tools[name];
      const activeVariant =
        currentState.mockConfig.globalEnabled && toolConfig?.activeVariantId
          ? toolConfig.variants.find((v) => v.id === toolConfig.activeVariantId)
          : null;

      const finalizeToolResult = (
        result: CallToolResponse & { _mockVariant?: string },
      ): CallToolResponse => {
        // ChatGPT/workbench compatibility metadata (see comment above).
        const enrichedMeta = {
          ...(result._meta ?? {}),
          "openai/widgetSessionId": currentState.widgetSessionId,
        };

        const enrichedResult: CallToolResponse = {
          ...result,
          _meta: enrichedMeta,
        };

        const methodLabel = result._mockVariant
          ? `callTool("${name}") → [MOCK: ${result._mockVariant}]`
          : `callTool("${name}") → response`;

        addConsoleEntry({
          type: "callTool",
          method: methodLabel,
          result: enrichedResult,
        });

        setToolOutput(enrichedResult.structuredContent ?? null);
        setToolResponseMetadata(enrichedResult._meta ?? null);

        if (enrichedResult._meta?.["openai/closeWidget"] === true) {
          setWidgetClosed(true);
        }

        return enrichedResult;
      };

      const runMockCall = async (delay: number): Promise<CallToolResponse> => {
        setActiveToolCall({
          toolName: name,
          delay,
          startTime: Date.now(),
        });

        let result;
        try {
          result = await handleMockToolCall(
            name,
            args,
            useWorkbenchStore.getState().mockConfig,
          );
        } finally {
          setActiveToolCall(null);
        }

        return finalizeToolResult(result);
      };

      const runServerCall = async (): Promise<CallToolResponse> => {
        const abortController = new AbortController();

        setActiveToolCall({
          toolName: name,
          delay: 0,
          startTime: Date.now(),
          cancelFn: () => {
            abortController.abort();
          },
        });

        try {
          const response = await callMcpTool(
            {
              tool: name,
              args,
              serverUrl: useWorkbenchStore.getState().mockConfig.serverUrl,
            },
            { signal: abortController.signal },
          );

          if (!response.success) {
            return finalizeToolResult({
              isError: true,
              content: response.error?.message ?? "MCP tool call failed",
              structuredContent: response.error
                ? { error: response.error, duration: response.duration }
                : { duration: response.duration },
            });
          }

          return finalizeToolResult({
            content: response.result?.content,
            structuredContent: response.result?.structuredContent,
            _meta: response.result?._meta,
            isError: response.result?.isError,
          });
        } finally {
          setActiveToolCall(null);
        }
      };

      const hasConfiguredMockOverride =
        currentState.mockConfig.globalEnabled &&
        Boolean(toolConfig?.activeVariantId || toolConfig?.mockResponse);

      if (hasConfiguredMockOverride) {
        return runMockCall(activeVariant?.delay ?? 300);
      }

      if (toolConfig?.source === "server") {
        return runServerCall();
      }

      const simConfig = currentState.simulation.tools[name];
      if (hasCustomSimulationConfig(simConfig)) {
        setActiveToolCall({
          toolName: name,
          delay: 300,
          startTime: Date.now(),
        });

        if (simConfig.responseMode === "hang") {
          addConsoleEntry({
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
              setActiveToolCall(null);
              addConsoleEntry({
                type: "callTool",
                method: `callTool("${name}") → [SIMULATED: hang timeout]`,
                result: { _note: "Hang simulation timed out after 30 seconds" },
              });
              reject(new Error("Simulated hang timed out after 30 seconds"));
            }, HANG_TIMEOUT_MS);

            const cancelFn = () => {
              cancelled = true;
              clearTimeout(timeoutId);
              addConsoleEntry({
                type: "callTool",
                method: `callTool("${name}") → [SIMULATED: hang cancelled]`,
                result: { _note: "Hang simulation cancelled by user" },
              });
              reject(new Error("Hang simulation cancelled"));
            };

            setActiveToolCall({
              toolName: name,
              delay: HANG_TIMEOUT_MS,
              startTime: Date.now(),
              isHanging: true,
              cancelFn,
            });
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
        setActiveToolCall(null);

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
              _meta: {
                "openai/widgetSessionId":
                  useWorkbenchStore.getState().widgetSessionId,
              },
            };
            break;
          default:
            result = {
              structuredContent: simConfig.responseData,
              _meta: {
                "openai/widgetSessionId":
                  useWorkbenchStore.getState().widgetSessionId,
              },
            };
            break;
        }

        addConsoleEntry({
          type: "callTool",
          method: `callTool("${name}") → [SIMULATED: ${modeLabel}]`,
          result,
        });

        setToolOutput(result.structuredContent ?? null);
        setToolResponseMetadata(result._meta ?? null);

        if (result._meta?.["openai/closeWidget"] === true) {
          setWidgetClosed(true);
        }

        return result;
      }

      return runMockCall(activeVariant?.delay ?? 300);
    },
    [
      addConsoleEntry,
      registerTool,
      setToolOutput,
      setToolResponseMetadata,
      setWidgetClosed,
      setActiveToolCall,
    ],
  );

  const handleSetWidgetState = useCallback(
    (state: WidgetState): void => {
      addConsoleEntry({
        type: "setWidgetState",
        method: "setWidgetState",
        args: state,
      });
      setWidgetState(state);
    },
    [addConsoleEntry, setWidgetState],
  );

  const handleRequestDisplayMode = useCallback(
    async (args: { mode: DisplayMode }): Promise<{ mode: DisplayMode }> => {
      const currentState = useWorkbenchStore.getState();
      const currentMode = currentState.displayMode;

      addConsoleEntry({
        type: "requestDisplayMode",
        method: `requestDisplayMode("${args.mode}")`,
        args,
      });

      if (currentMode === args.mode) {
        return { mode: args.mode };
      }

      if (currentState.isTransitioning) {
        return { mode: args.mode };
      }

      if (
        reducedMotion ||
        typeof document === "undefined" ||
        !("startViewTransition" in document)
      ) {
        setDisplayMode(args.mode);
        return { mode: args.mode };
      }

      flushSync(() => {
        setTransitioning(true);
      });

      const transition = (
        document as Document & {
          startViewTransition: (callback: () => void) => {
            finished: Promise<void>;
          };
        }
      ).startViewTransition(() => {
        flushSync(() => {
          setDisplayMode(args.mode);
        });
      });

      transition.finished.finally(() => {
        setTransitioning(false);
      });

      return { mode: args.mode };
    },
    [addConsoleEntry, reducedMotion, setDisplayMode, setTransitioning],
  );

  const handleSendFollowUpMessage = useCallback(
    async (args: { prompt: string }): Promise<void> => {
      addConsoleEntry({
        type: "sendFollowUpMessage",
        method: "sendFollowUpMessage",
        args,
      });
    },
    [addConsoleEntry],
  );

  const handleRequestClose = useCallback(() => {
    addConsoleEntry({
      type: "requestClose",
      method: "requestClose",
    });
    setWidgetClosed(true);
  }, [addConsoleEntry, setWidgetClosed]);

  const handleOpenExternal = useCallback(
    (payload: { href: string }) => {
      addConsoleEntry({
        type: "openExternal",
        method: `openExternal("${payload.href}")`,
        args: payload,
      });
      window.open(payload.href, "_blank", "noopener,noreferrer");
    },
    [addConsoleEntry],
  );

  const handleNotifyIntrinsicHeight = useCallback(
    (height: number) => {
      addConsoleEntry({
        type: "notifyIntrinsicHeight",
        method: `notifyIntrinsicHeight(${height})`,
        args: { height },
      });
      const nextHeight = Number.isFinite(height) ? Math.max(0, height) : null;
      setIntrinsicHeight(nextHeight);
    },
    [addConsoleEntry, setIntrinsicHeight],
  );

  const handleRequestModal = useCallback(
    async (options: ModalOptions): Promise<void> => {
      addConsoleEntry({
        type: "requestModal",
        method: `requestModal("${options.title ?? "Modal"}")`,
        args: options,
      });

      setView({
        mode: "modal",
        params: options.params ?? null,
      });
    },
    [addConsoleEntry, setView],
  );

  const handleUploadFile = useCallback(
    async (file: File) => {
      const fileId = storeFile(file);

      addConsoleEntry({
        type: "uploadFile",
        method: `uploadFile("${file.name}")`,
        args: { name: file.name, size: file.size, type: file.type },
        result: { fileId },
      });

      return { fileId };
    },
    [addConsoleEntry],
  );

  const handleGetFileDownloadUrl = useCallback(
    async (args: { fileId: string }) => {
      const downloadUrl = getFileUrl(args.fileId);

      addConsoleEntry({
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
    [addConsoleEntry],
  );

  const handleSetOpenInAppUrl = useCallback(
    (args: { href: string }) => {
      openInAppUrlRef.current = args.href;
      addConsoleEntry({
        type: "setOpenInAppUrl",
        method: `setOpenInAppUrl("${args.href}")`,
        args,
        result: {
          registered: true,
          note: "Open in App URL registered for current tool-call lifecycle.",
        },
      });
    },
    [addConsoleEntry],
  );

  const handleRequestCheckout = useCallback(
    async (request: CheckoutRequest): Promise<CheckoutResult> => {
      const result: CheckoutResult = {
        status: "completed",
        beta: true,
        requestId:
          typeof request.id === "string"
            ? request.id
            : `checkout_${Date.now().toString(36)}`,
      };

      addConsoleEntry({
        type: "requestCheckout",
        method: "requestCheckout (beta)",
        args: request,
        result,
      });

      return result;
    },
    [addConsoleEntry],
  );

  const handleCallToolRef = useRef(handleCallTool);
  useEffect(() => {
    handleCallToolRef.current = handleCallTool;
  }, [handleCallTool]);

  const handleOpenExternalRef = useRef(handleOpenExternal);
  useEffect(() => {
    handleOpenExternalRef.current = handleOpenExternal;
  }, [handleOpenExternal]);

  const handleRequestDisplayModeRef = useRef(handleRequestDisplayMode);
  useEffect(() => {
    handleRequestDisplayModeRef.current = handleRequestDisplayMode;
  }, [handleRequestDisplayMode]);

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
      setOpenInAppUrl: handleSetOpenInAppUrl,
      requestCheckout: handleRequestCheckout,
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
      handleSetOpenInAppUrl,
      handleRequestCheckout,
    ],
  );
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const srcdoc = useMemo(() => {
    if (hmrSrc) return null;

    // Keep srcDoc stable while globals evolve; the bridge pushes all runtime
    // updates via OPENAI_SET_GLOBALS without reloading the iframe.
    const initialGlobals = globalsRef.current;

    if (!widgetBundle) {
      return generateEmptyIframeHtml(
        initialGlobals,
        true,
        true,
        demoMode ? "/workbench-bundles/demo.css" : undefined,
      );
    }
    return generateIframeHtml({
      widgetBundle,
      cssBundle,
      cssHref: demoMode ? "/workbench-bundles/demo.css" : undefined,
      initialGlobals,
      useTailwindCdn: !demoMode,
      includeOpenAIShim: true,
    });
  }, [widgetBundle, cssBundle, demoMode, hmrSrc]);

  useLayoutEffect(() => {
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

    bridge.onloggingmessage = ({ level, logger, data }) => {
      useWorkbenchStore.getState().addConsoleEntry({
        type: "event",
        method: `notifications/message (${logger ?? "widget"})`,
        args: { level, data },
      });
    };

    bridge.onopenlink = async ({ url }) => {
      handleOpenExternalRef.current({ href: url });
      return {};
    };

    bridge.onrequestdisplaymode = async ({ mode }) => {
      return handleRequestDisplayModeRef.current({ mode: mode as DisplayMode });
    };

    bridge.onmessage = async ({ role, content }) => {
      useWorkbenchStore.getState().addConsoleEntry({
        type: "event",
        method: "ui/message",
        args: { role, content },
      });
      return {};
    };

    bridge.onupdatemodelcontext = async ({ content, structuredContent }) => {
      useWorkbenchStore.getState().addConsoleEntry({
        type: "event",
        method: "ui/update-model-context",
        args: { content, structuredContent },
      });
      return {};
    };

    bridge.oncalltool = async (params) => {
      const name = params.name as string;
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      const result = await handleCallToolRef.current(name, args);
      return toMcpToolResultParams(result) as any;
    };

    bridge.oninitialized = () => {
      if (cancelled) return;
      mcpInitializedRef.current = true;
      void bridge.sendToolInput({ arguments: globalsRef.current.toolInput });
      const initialToolResult = buildToolResultBridgePayload(
        globalsRef.current.toolOutput,
        globalsRef.current.toolResponseMetadata,
      );

      if (initialToolResult) {
        void bridge.sendToolResult(
          toMcpToolResultParams(initialToolResult) as any,
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
  }, [demoMode, iframeKey]);

  useEffect(() => {
    bridgeRef.current?.setHandlers(handlers);
  }, [handlers]);

  useEffect(() => {
    return () => {
      clearFiles();
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
    globals.previewTheme,
    globals.locale,
    globals.displayMode,
    globals.maxHeight,
    globals.safeArea,
    globals.userAgent,
  ]);

  const toolInputStr = JSON.stringify(globals.toolInput);
  useEffect(() => {
    const bridge = mcpBridgeRef.current;
    if (!bridge || !mcpInitializedRef.current || !toolInputStr) return;
    void bridge.sendToolInput({ arguments: JSON.parse(toolInputStr) });
  }, [toolInputStr]);

  const toolOutputStr = JSON.stringify(globals.toolOutput ?? null);
  const toolResponseMetadataStr = JSON.stringify(
    globals.toolResponseMetadata ?? null,
  );
  useEffect(() => {
    const bridge = mcpBridgeRef.current;
    if (!bridge || !mcpInitializedRef.current) return;

    const toolResult = buildToolResultBridgePayload(
      JSON.parse(toolOutputStr),
      JSON.parse(toolResponseMetadataStr),
    );

    if (!toolResult) return;

    void bridge.sendToolResult(toMcpToolResultParams(toolResult) as any);
  }, [toolOutputStr, toolResponseMetadataStr]);

  useEffect(() => {
    setIntrinsicHeight(null);
    setIframeKey((k) => k + 1);
  }, [cssBundle, hmrSrc, setIntrinsicHeight, widgetBundle]);

  const effectiveTheme = globals.previewTheme || globals.theme;
  const iframeShellBackground =
    effectiveTheme === "dark" ? "rgb(23 23 23)" : "transparent";

  return (
    <iframe
      key={iframeKey}
      ref={iframeRef}
      src={hmrSrc ?? undefined}
      srcDoc={srcdoc ?? undefined}
      className={className}
      style={{
        border: "none",
        width: "100%",
        height: "100%",
        backgroundColor: iframeShellBackground,
        ...style,
      }}
      sandbox="allow-scripts allow-same-origin"
      data-mcp-host=""
      title="Widget Preview"
    />
  );
}
