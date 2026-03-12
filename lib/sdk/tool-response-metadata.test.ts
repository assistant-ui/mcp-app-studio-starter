import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  readToolResponseMetadata,
  useToolResponseMetadata,
} from "./tool-response-metadata";

type MockWindow = {
  openai?: Record<string, unknown>;
};

afterEach(() => {
  delete (globalThis as { window?: MockWindow }).window;
});

describe("tool response metadata helpers", () => {
  it("exports a hook function", () => {
    assert.equal(typeof useToolResponseMetadata, "function");
  });

  it("reads tool response metadata from window.openai", () => {
    (globalThis as { window?: MockWindow }).window = {
      openai: {
        toolResponseMetadata: {
          "openai/widgetDescription": "Private debug metadata",
        },
      },
    };

    assert.deepEqual(readToolResponseMetadata(), {
      "openai/widgetDescription": "Private debug metadata",
    });
  });

  it("returns null when metadata is unavailable", () => {
    (globalThis as { window?: MockWindow }).window = { openai: {} };

    assert.equal(readToolResponseMetadata(), null);
  });
});
