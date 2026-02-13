import * as assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { useWorkbenchStore } from "./store";

describe("Workbench Store", () => {
  beforeEach(() => {
    const store = useWorkbenchStore.getState();
    store.setToolInput({});
    store.setToolOutput(null);
    store.setWidgetState(null);
    store.setToolResponseMetadata(null);
  });

  describe("getOpenAIGlobals", () => {
    it("should return correct theme", () => {
      const store = useWorkbenchStore.getState();

      store.setTheme("dark");
      const globals = store.getOpenAIGlobals();

      assert.strictEqual(globals.theme, "dark");
    });

    it("should return correct locale", () => {
      const store = useWorkbenchStore.getState();

      store.setLocale("es-ES");
      const globals = store.getOpenAIGlobals();

      assert.strictEqual(globals.locale, "es-ES");
    });

    it("should return correct displayMode", () => {
      const store = useWorkbenchStore.getState();

      store.setDisplayMode("fullscreen");
      const globals = store.getOpenAIGlobals();

      assert.strictEqual(globals.displayMode, "fullscreen");
    });

    it("should return correct maxHeight", () => {
      const store = useWorkbenchStore.getState();

      store.setMaxHeight(1200);
      const globals = store.getOpenAIGlobals();

      assert.strictEqual(globals.maxHeight, 1200);
    });

    it("should include toolInput", () => {
      const store = useWorkbenchStore.getState();
      const testInput = { testKey: "testValue" };

      store.setToolInput(testInput);
      const globals = store.getOpenAIGlobals();

      assert.deepStrictEqual(globals.toolInput, testInput);
    });

    it("should include toolOutput (null when unset)", () => {
      const store = useWorkbenchStore.getState();

      store.setToolOutput(null);
      const globals = store.getOpenAIGlobals();

      assert.strictEqual(globals.toolOutput, null);
    });

    it("should include toolOutput (object when set)", () => {
      const store = useWorkbenchStore.getState();
      const testOutput = { resultKey: "resultValue" };

      store.setToolOutput(testOutput);
      const globals = store.getOpenAIGlobals();

      assert.deepStrictEqual(globals.toolOutput, testOutput);
    });

    it("should include widgetState", () => {
      const store = useWorkbenchStore.getState();
      const testState = { stateKey: "stateValue" };

      store.setWidgetState(testState);
      const globals = store.getOpenAIGlobals();

      assert.deepStrictEqual(globals.widgetState, testState);
    });

    it("should include toolResponseMetadata", () => {
      const store = useWorkbenchStore.getState();
      const testMetadata = { metaKey: "metaValue" };

      store.setToolResponseMetadata(testMetadata);
      const globals = store.getOpenAIGlobals();

      assert.deepStrictEqual(globals.toolResponseMetadata, testMetadata);
    });

    it("should include safeAreaInsets", () => {
      const store = useWorkbenchStore.getState();
      const testInsets = { top: 10, bottom: 20, left: 5, right: 5 };

      store.setSafeAreaInsets(testInsets);
      const globals = store.getOpenAIGlobals();

      assert.deepStrictEqual(globals.safeArea.insets, testInsets);
    });

    it("should include userAgent with device type", () => {
      const store = useWorkbenchStore.getState();

      store.setDeviceType("mobile");
      const globals = store.getOpenAIGlobals();

      assert.strictEqual(globals.userAgent.device.type, "mobile");
    });

    it("should include userAgent capabilities for mobile (no hover, touch)", () => {
      const store = useWorkbenchStore.getState();

      store.setDeviceType("mobile");
      const globals = store.getOpenAIGlobals();

      assert.strictEqual(globals.userAgent.capabilities.hover, false);
      assert.strictEqual(globals.userAgent.capabilities.touch, true);
    });

    it("should include userAgent capabilities for desktop (hover, no touch)", () => {
      const store = useWorkbenchStore.getState();

      store.setDeviceType("desktop");
      const globals = store.getOpenAIGlobals();

      assert.strictEqual(globals.userAgent.capabilities.hover, true);
      assert.strictEqual(globals.userAgent.capabilities.touch, false);
    });
  });

  describe("setDeviceType", () => {
    it("should update deviceType without changing maxHeight", () => {
      const store = useWorkbenchStore.getState();
      const initialMaxHeight = store.maxHeight;

      store.setDeviceType("mobile");
      const state = useWorkbenchStore.getState();

      assert.strictEqual(state.deviceType, "mobile");
      assert.strictEqual(state.maxHeight, initialMaxHeight);
    });

    it("should update deviceType to tablet without changing maxHeight", () => {
      const store = useWorkbenchStore.getState();
      store.setMaxHeight(500);

      store.setDeviceType("tablet");
      const state = useWorkbenchStore.getState();

      assert.strictEqual(state.deviceType, "tablet");
      assert.strictEqual(state.maxHeight, 500);
    });

    it("should update deviceType to desktop without changing maxHeight", () => {
      const store = useWorkbenchStore.getState();
      store.setMaxHeight(600);

      store.setDeviceType("desktop");
      const state = useWorkbenchStore.getState();

      assert.strictEqual(state.deviceType, "desktop");
      assert.strictEqual(state.maxHeight, 600);
    });
  });

  describe("OpenAI Globals Consistency", () => {
    it("should reflect all state changes in getOpenAIGlobals", () => {
      const store = useWorkbenchStore.getState();

      // Set various state values
      store.setTheme("dark");
      store.setLocale("fr-FR");
      store.setDisplayMode("pip");
      store.setDeviceType("tablet");
      store.setMaxHeight(1500);
      store.setToolInput({ input1: "value1" });
      store.setToolOutput({ output1: "result1" });
      store.setWidgetState({ state1: "stateValue1" });
      store.setToolResponseMetadata({ meta1: "metaValue1" });
      store.setSafeAreaInsets({ top: 15, bottom: 25, left: 10, right: 10 });

      const globals = store.getOpenAIGlobals();

      // Verify all values are correctly reflected
      assert.strictEqual(globals.theme, "dark");
      assert.strictEqual(globals.locale, "fr-FR");
      assert.strictEqual(globals.displayMode, "pip");
      assert.strictEqual(globals.maxHeight, 1500);
      assert.deepStrictEqual(globals.toolInput, { input1: "value1" });
      assert.deepStrictEqual(globals.toolOutput, { output1: "result1" });
      assert.deepStrictEqual(globals.widgetState, { state1: "stateValue1" });
      assert.deepStrictEqual(globals.toolResponseMetadata, {
        meta1: "metaValue1",
      });
      assert.deepStrictEqual(globals.safeArea.insets, {
        top: 15,
        bottom: 25,
        left: 10,
        right: 10,
      });
      assert.strictEqual(globals.userAgent.device.type, "tablet");
    });

    it("should maintain consistent structure across multiple calls", () => {
      const store = useWorkbenchStore.getState();

      const globals1 = store.getOpenAIGlobals();
      const globals2 = store.getOpenAIGlobals();

      // Should have identical structure
      assert.deepStrictEqual(globals1, globals2);
      assert.deepStrictEqual(
        Object.keys(globals1).sort(),
        Object.keys(globals2).sort(),
      );
    });

    it("should handle null values correctly in globals", () => {
      const store = useWorkbenchStore.getState();

      // Set all nullable fields to null
      store.setToolOutput(null);
      store.setWidgetState(null);
      store.setToolResponseMetadata(null);

      const globals = store.getOpenAIGlobals();

      assert.strictEqual(globals.toolOutput, null);
      assert.strictEqual(globals.widgetState, null);
      assert.strictEqual(globals.toolResponseMetadata, null);
    });

    it("should update globals when safeAreaInsets are partially updated", () => {
      const store = useWorkbenchStore.getState();

      // Set initial insets
      store.setSafeAreaInsets({ top: 10, bottom: 10, left: 10, right: 10 });

      // Partially update (should merge with existing)
      store.setSafeAreaInsets({ top: 20 });

      const globals = store.getOpenAIGlobals();

      assert.strictEqual(globals.safeArea.insets.top, 20);
      assert.strictEqual(globals.safeArea.insets.bottom, 10);
      assert.strictEqual(globals.safeArea.insets.left, 10);
      assert.strictEqual(globals.safeArea.insets.right, 10);
    });
  });
});
