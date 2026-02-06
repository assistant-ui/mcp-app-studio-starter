import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WorkbenchMessageBridge } from "./workbench-message-bridge";

function createBridge() {
  return new WorkbenchMessageBridge({
    callTool: async () => ({ structuredContent: {} }),
    setWidgetState: () => {},
    requestDisplayMode: async ({ mode }) => ({ mode }),
    sendFollowUpMessage: async () => {},
    requestClose: () => {},
    openExternal: () => {},
    notifyIntrinsicHeight: () => {},
    requestModal: async () => {},
    uploadFile: async () => ({ fileId: "file_1" }),
    getFileDownloadUrl: async () => ({ downloadUrl: "https://example.com" }),
  });
}

describe("WorkbenchMessageBridge", () => {
  it("stops OPENAI method-call messages from propagating to other listeners", async () => {
    const bridge = createBridge() as unknown as {
      iframe: { contentWindow: unknown } | null;
      handleMessage: (event: MessageEvent) => void;
    };

    const sourceWindow = {
      postMessage: () => {},
    };
    bridge.iframe = { contentWindow: sourceWindow };

    const previousWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window: unknown }).window = {
      location: { origin: "http://localhost" },
    };

    let stopped = false;
    try {
      bridge.handleMessage({
        source: sourceWindow,
        data: {
          type: "OPENAI_METHOD_CALL",
          id: "msg_1",
          method: "setWidgetState",
          args: [{ foo: "bar" }],
        },
        stopImmediatePropagation: () => {
          stopped = true;
        },
      } as unknown as MessageEvent);

      // Flush any queued async work from processMethodCall.
      await Promise.resolve();

      assert.equal(stopped, true);
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window: unknown }).window = previousWindow;
      }
    }
  });
});
