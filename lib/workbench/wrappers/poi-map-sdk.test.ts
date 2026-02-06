import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSerializablePOIMapInput } from "./poi-map-input";

const VALID_INPUT = {
  id: "test-poi-map",
  pois: [
    {
      id: "1",
      name: "Golden Gate Bridge",
      category: "landmark",
      lat: 37.8199,
      lng: -122.4783,
    },
  ],
  initialCenter: { lat: 37.7749, lng: -122.4194 },
  initialZoom: 12,
  title: "San Francisco POIs",
};

describe("resolveSerializablePOIMapInput", () => {
  it("uses the primary tool input when valid", () => {
    const parsed = resolveSerializablePOIMapInput(VALID_INPUT);
    assert.equal(parsed.id, VALID_INPUT.id);
    assert.equal(parsed.pois.length, 1);
  });

  it("falls back to OpenAI tool input when primary is invalid", () => {
    const parsed = resolveSerializablePOIMapInput({}, VALID_INPUT);
    assert.equal(parsed.id, VALID_INPUT.id);
    assert.equal(parsed.pois.length, 1);
  });

  it("returns safe defaults when both primary and fallback are invalid", () => {
    const parsed = resolveSerializablePOIMapInput({}, null);
    assert.equal(typeof parsed.id, "string");
    assert.ok(Array.isArray(parsed.pois));
  });
});
