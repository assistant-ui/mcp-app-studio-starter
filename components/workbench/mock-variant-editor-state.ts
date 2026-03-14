import type { MockResponse } from "@/lib/workbench/mock-config";

export function getMockResponseSemanticKey(response: MockResponse): string {
  return JSON.stringify(response);
}

export function shouldSyncInlineMockVariantDraft({
  previousVariantId,
  nextVariantId,
  nextResponseKey,
  lastSubmittedResponseKey,
}: {
  previousVariantId: string;
  nextVariantId: string;
  nextResponseKey: string;
  lastSubmittedResponseKey: string | null;
}): boolean {
  if (previousVariantId !== nextVariantId) {
    return true;
  }

  return nextResponseKey !== lastSubmittedResponseKey;
}
