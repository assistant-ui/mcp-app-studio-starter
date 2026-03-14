import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/components/examples/poi-map";
import { resolveDemoWidgetState } from "./poi-map-demo-state";

describe("poi map demo state helpers", () => {
  it("merges host widget state over the demo defaults", () => {
    assert.deepEqual(
      resolveDemoWidgetState({
        categoryFilter: "cafe",
        favoriteIds: ["3"],
      }),
      {
        selectedPoiId: null,
        favoriteIds: ["3"],
        mapCenter: DEFAULT_CENTER,
        mapZoom: DEFAULT_ZOOM + 1,
        categoryFilter: "cafe",
      },
    );
  });

  it("falls back to defaults when host widget state is invalid", () => {
    assert.deepEqual(resolveDemoWidgetState(["not", "an", "object"]), {
      selectedPoiId: null,
      favoriteIds: [],
      mapCenter: DEFAULT_CENTER,
      mapZoom: DEFAULT_ZOOM + 1,
      categoryFilter: null,
    });
  });
});
