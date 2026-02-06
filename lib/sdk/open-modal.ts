"use client";

export interface HostModalOptions {
  title?: string;
  params?: Record<string, unknown>;
  anchor?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type OpenModalResult = "host" | "fallback";

type OpenAIModalAPI = {
  requestModal?: (options: HostModalOptions) => Promise<void>;
};

function getRequestModal():
  | ((options: HostModalOptions) => Promise<void>)
  | undefined {
  if (typeof window === "undefined") return undefined;

  const openai = (window as Window & { openai?: OpenAIModalAPI }).openai;
  if (!openai || typeof openai.requestModal !== "function") {
    return undefined;
  }

  return openai.requestModal.bind(openai);
}

/**
 * Open a host-managed modal when available, otherwise run a local fallback.
 * This keeps modal interactions MCP-first while still supporting ChatGPT extensions.
 */
export async function openModal(
  options: HostModalOptions,
  fallback?: () => void | Promise<void>,
): Promise<OpenModalResult> {
  const requestModal = getRequestModal();

  if (requestModal) {
    await requestModal(options);
    return "host";
  }

  if (fallback) {
    await fallback();
  }

  return "fallback";
}
