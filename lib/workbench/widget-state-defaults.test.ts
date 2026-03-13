import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POI_MAP_DEMO_INPUT } from "./demo/default-props";
import {
  resolveInitialWidgetState,
  resolveResetWidgetState,
  resolveVisibleWidgetState,
} from "./widget-state-defaults";

describe("resolveInitialWidgetState", () => {
  it("returns the effective initial widget state for the poi-map component", () => {
    assert.deepEqual(resolveInitialWidgetState("poi-map", POI_MAP_DEMO_INPUT), {
      selectedPoiId: null,
      favoriteIds: [],
      mapCenter: POI_MAP_DEMO_INPUT.initialCenter,
      mapZoom: POI_MAP_DEMO_INPUT.initialZoom,
      categoryFilter: null,
    });
  });

  it("returns an empty object for components without widget state", () => {
    assert.deepEqual(resolveInitialWidgetState("welcome", {}), {});
  });

  it("keeps reset widget state derived from the latest tool input", () => {
    const initialToolInput = {
      ...POI_MAP_DEMO_INPUT,
      initialCenter: { lat: 1, lng: 2 },
      initialZoom: 5,
    };
    const nextToolInput = {
      ...POI_MAP_DEMO_INPUT,
      initialCenter: { lat: 9, lng: 9 },
      initialZoom: 11,
    };

    const resetValue = resolveResetWidgetState("poi-map", initialToolInput);

    assert.equal(resetValue, null);
    assert.deepEqual(
      resolveVisibleWidgetState("poi-map", initialToolInput, resetValue),
      resolveInitialWidgetState("poi-map", initialToolInput),
    );
    assert.deepEqual(
      resolveVisibleWidgetState("poi-map", nextToolInput, resetValue),
      resolveInitialWidgetState("poi-map", nextToolInput),
    );
  });
});
