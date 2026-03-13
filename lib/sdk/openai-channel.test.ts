import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  OPENAI_SET_GLOBALS_EVENT,
  readOpenAIChannel,
  readOpenAIChannelSnapshot,
  subscribeToOpenAIChannel,
} from "./openai-channel";

type MockWindow = EventTarget & {
  openai?: Record<string, unknown>;
};

function setMockWindow(mockWindow: MockWindow) {
  (globalThis as { window?: MockWindow }).window = mockWindow;
}

function createMockWindow(openai?: Record<string, unknown>): MockWindow {
  const mockWindow = new EventTarget() as MockWindow;
  mockWindow.openai = openai;
  return mockWindow;
}

afterEach(() => {
  delete (globalThis as { window?: MockWindow }).window;
});

describe("openai channel helpers", () => {
  it("reads the current channel value from window.openai", () => {
    setMockWindow(
      createMockWindow({
        widgetState: { selectedPoiId: "poi_123" },
      }),
    );

    assert.deepEqual(readOpenAIChannel("widgetState"), {
      selectedPoiId: "poi_123",
    });
  });

  it("returns null when the channel is missing", () => {
    setMockWindow(createMockWindow());

    assert.equal(readOpenAIChannel("toolResponseMetadata"), null);
  });

  it("distinguishes an explicit null channel value from a missing channel", () => {
    setMockWindow(
      createMockWindow({
        widgetState: null,
      }),
    );

    assert.deepEqual(readOpenAIChannelSnapshot("widgetState"), {
      available: true,
      value: null,
    });

    setMockWindow(createMockWindow());

    assert.deepEqual(readOpenAIChannelSnapshot("widgetState"), {
      available: false,
      value: null,
    });
  });

  it("subscribes only to updates for the requested channel", () => {
    const mockWindow = createMockWindow({
      widgetState: { selectedPoiId: null },
    });
    setMockWindow(mockWindow);

    let notifications = 0;
    const unsubscribe = subscribeToOpenAIChannel("widgetState", () => {
      notifications += 1;
    });

    try {
      mockWindow.dispatchEvent(
        new CustomEvent(OPENAI_SET_GLOBALS_EVENT, {
          detail: {
            globals: {
              toolInput: { query: "coffee" },
            },
          },
        }),
      );

      mockWindow.dispatchEvent(
        new CustomEvent(OPENAI_SET_GLOBALS_EVENT, {
          detail: {
            globals: {
              widgetState: { selectedPoiId: "poi_456" },
            },
          },
        }),
      );

      assert.equal(notifications, 1);
    } finally {
      unsubscribe();
    }
  });

  it("cleans up the event listener on unsubscribe", () => {
    const mockWindow = createMockWindow({
      widgetState: { selectedPoiId: null },
    });
    setMockWindow(mockWindow);

    let notifications = 0;
    const unsubscribe = subscribeToOpenAIChannel("widgetState", () => {
      notifications += 1;
    });

    unsubscribe();

    mockWindow.dispatchEvent(
      new CustomEvent(OPENAI_SET_GLOBALS_EVENT, {
        detail: {
          globals: {
            widgetState: { selectedPoiId: "poi_789" },
          },
        },
      }),
    );

    assert.equal(notifications, 0);
  });
});
