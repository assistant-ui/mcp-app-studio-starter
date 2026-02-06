import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { openModal } from "./open-modal";

describe("openModal", () => {
  it("uses host requestModal when available", async () => {
    let hostCalled = false;
    let fallbackCalled = false;
    const originalWindow = (globalThis as any).window;

    try {
      (globalThis as any).window = {
        openai: {
          requestModal: async () => {
            hostCalled = true;
          },
        },
      };

      const result = await openModal({ title: "Details" }, () => {
        fallbackCalled = true;
      });

      assert.equal(result, "host");
      assert.equal(hostCalled, true);
      assert.equal(fallbackCalled, false);
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  it("falls back when host requestModal is unavailable", async () => {
    let fallbackCalled = false;
    const originalWindow = (globalThis as any).window;

    try {
      (globalThis as any).window = { openai: {} };

      const result = await openModal({ title: "Details" }, () => {
        fallbackCalled = true;
      });

      assert.equal(result, "fallback");
      assert.equal(fallbackCalled, true);
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });
});
