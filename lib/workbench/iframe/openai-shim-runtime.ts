import {
  OPENAI_SET_GLOBALS_EVENT,
  WORKBENCH_OPENAI_SHIM_MARKER,
} from "@/lib/sdk/openai-channel-contract";
import type { OpenAIAPI, OpenAIGlobals, ParentToIframeMessage } from "../types";

type OpenAIShimWindow = Window & {
  openai?: OpenAIGlobals & OpenAIAPI;
  /** Cached by the preview.html inline script before modules load. */
  __OPENAI_INITIAL_GLOBALS?: Partial<OpenAIGlobals>;
  __MCP_APP_STUDIO_WORKBENCH_OPENAI_SHIM__?: boolean;
};

const DEFAULT_GLOBALS: OpenAIGlobals = {
  theme: "light",
  locale: "en-US",
  displayMode: "inline",
  previousDisplayMode: null,
  maxHeight: 600,
  toolInput: {},
  toolOutput: null,
  toolResponseMetadata: null,
  widgetState: null,
  userAgent: {
    device: { type: "desktop" },
    capabilities: { hover: true, touch: false },
  },
  safeArea: {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  },
  view: null,
  userLocation: null,
};

function generateCallId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function dispatchGlobalsChange(changedGlobals: Partial<OpenAIGlobals>) {
  const event = new CustomEvent(OPENAI_SET_GLOBALS_EVENT, {
    detail: { globals: changedGlobals },
  });
  window.dispatchEvent(event);
}

function buildChangedGlobals(
  prev: OpenAIGlobals | null,
  next: OpenAIGlobals,
): Partial<OpenAIGlobals> {
  if (!prev) return next;
  const changed: Partial<OpenAIGlobals> = {};
  for (const [key, value] of Object.entries(next)) {
    const typedKey = key as keyof OpenAIGlobals;
    if (prev[typedKey] !== value) {
      changed[typedKey] = value as never;
    }
  }
  return changed;
}

function updateThemeClass(theme: OpenAIGlobals["theme"] | undefined) {
  const root = document.documentElement;
  const normalized = theme === "dark" ? "dark" : "light";
  root.setAttribute("data-theme", normalized);
  if (normalized === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
  window.dispatchEvent(new Event("themechange"));
}

export function installOpenAIShim(targetWindow: Window = window) {
  const shimWindow = targetWindow as OpenAIShimWindow;
  if (shimWindow.openai) return;

  const pendingCalls = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
  >();
  let globals = { ...DEFAULT_GLOBALS };
  let previousGlobals: OpenAIGlobals | null = null;

  function callMethod<T>(method: keyof OpenAIAPI, args: unknown[]) {
    return new Promise<T>((resolve, reject) => {
      const id = generateCallId();
      pendingCalls.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      shimWindow.parent.postMessage(
        {
          type: "OPENAI_METHOD_CALL",
          id,
          method,
          args,
        },
        "*",
      );
    });
  }

  function applyGlobals(nextGlobals: OpenAIGlobals) {
    previousGlobals = globals;
    globals = nextGlobals;
    const changed = buildChangedGlobals(previousGlobals, globals);
    if (Object.keys(changed).length > 0) {
      updateThemeClass(nextGlobals.previewTheme || nextGlobals.theme);
      dispatchGlobalsChange(changed);
    }
  }

  function handleMessage(event: MessageEvent) {
    const message = event.data as ParentToIframeMessage | undefined;
    if (!message || typeof message !== "object" || !("type" in message)) return;

    if (message.type === "OPENAI_SET_GLOBALS") {
      event.stopImmediatePropagation?.();
      event.stopPropagation?.();
      applyGlobals({
        ...DEFAULT_GLOBALS,
        ...message.globals,
      });
      return;
    }

    if (message.type === "OPENAI_METHOD_RESPONSE") {
      const pending = pendingCalls.get(message.id);
      if (!pending) return;
      if (message.error) {
        pending.reject(new Error(message.error));
      } else {
        pending.resolve(message.result);
      }
      pendingCalls.delete(message.id);
    }
  }

  shimWindow.addEventListener("message", handleMessage);

  const api: OpenAIAPI = {
    callTool: async (name, args) => callMethod("callTool", [name, args]),
    requestClose: () => {
      void callMethod("requestClose", []);
    },
    sendFollowUpMessage: async (args) =>
      callMethod("sendFollowUpMessage", [args]) as Promise<void>,
    openExternal: (payload) => {
      void callMethod("openExternal", [payload]);
    },
    requestDisplayMode: async (args) =>
      callMethod("requestDisplayMode", [args]),
    setWidgetState: (state) => {
      void callMethod("setWidgetState", [state]);
    },
    notifyIntrinsicHeight: (height) => {
      void callMethod("notifyIntrinsicHeight", [height]);
    },
    requestModal: async (options) =>
      callMethod("requestModal", [options]) as Promise<void>,
    uploadFile: async (file) => callMethod("uploadFile", [file]),
    getFileDownloadUrl: async (args) =>
      callMethod("getFileDownloadUrl", [args]),
    setOpenInAppUrl: (args) => {
      void callMethod("setOpenInAppUrl", [args]);
    },
    requestCheckout: async (request) =>
      callMethod("requestCheckout", [request]),
  };

  Object.defineProperty(shimWindow, "openai", {
    value: Object.assign(
      Object.create(null, {
        theme: { get: () => globals.theme, enumerable: true },
        locale: { get: () => globals.locale, enumerable: true },
        displayMode: { get: () => globals.displayMode, enumerable: true },
        maxHeight: { get: () => globals.maxHeight, enumerable: true },
        toolInput: { get: () => globals.toolInput, enumerable: true },
        toolOutput: { get: () => globals.toolOutput, enumerable: true },
        toolResponseMetadata: {
          get: () => globals.toolResponseMetadata,
          enumerable: true,
        },
        widgetState: { get: () => globals.widgetState, enumerable: true },
        userAgent: { get: () => globals.userAgent, enumerable: true },
        safeArea: { get: () => globals.safeArea, enumerable: true },
        view: { get: () => globals.view, enumerable: true },
        userLocation: { get: () => globals.userLocation, enumerable: true },
      }),
      api,
    ),
    configurable: false,
    writable: false,
  });
  shimWindow[WORKBENCH_OPENAI_SHIM_MARKER] = true;

  // The host sends OPENAI_SET_GLOBALS on the iframe `load` event, which fires
  // before ES modules execute. The preview.html inline script caches those
  // globals so we can hydrate immediately instead of waiting for the next
  // postMessage round-trip.
  const cached = shimWindow.__OPENAI_INITIAL_GLOBALS;
  if (cached) {
    applyGlobals({ ...DEFAULT_GLOBALS, ...cached });
    delete shimWindow.__OPENAI_INITIAL_GLOBALS;
  }
}
