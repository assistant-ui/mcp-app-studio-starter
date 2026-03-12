import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POI_MAP_DEMO_INPUT } from "./demo/default-props";
import { resolveInitialWidgetState } from "./widget-state-defaults";

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
});
