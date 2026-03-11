import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveWidgetHeight } from "./chat-thread-layout";

describe("resolveWidgetHeight", () => {
  it("falls back to maxHeight when intrinsic height is unavailable", () => {
    assert.equal(resolveWidgetHeight(400, null), 400);
  });

  it("clamps intrinsic height to maxHeight when provided", () => {
    assert.equal(resolveWidgetHeight(400, 320), 320);
    assert.equal(resolveWidgetHeight(400, 720), 400);
  });

  it("ignores zero intrinsic height so inline previews do not collapse", () => {
    assert.equal(resolveWidgetHeight(400, 0), 400);
  });
});
