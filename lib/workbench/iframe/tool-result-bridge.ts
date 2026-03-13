import type { CallToolResponse } from "../types";

interface BuildToolResultBridgePayloadOptions {
  toolOutput: Record<string, unknown> | null;
  toolResponseMetadata: Record<string, unknown> | null;
}

export function buildToolResultBridgePayload({
  toolOutput,
  toolResponseMetadata,
}: BuildToolResultBridgePayloadOptions): CallToolResponse | null {
  if (toolOutput === null && toolResponseMetadata === null) {
    return null;
  }

  const result: CallToolResponse = {};

  if (toolOutput !== null) {
    result.structuredContent = toolOutput;
  }

  if (toolResponseMetadata !== null) {
    result._meta = toolResponseMetadata;
  }

  return result;
}
