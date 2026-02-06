import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBundleRequestPath } from "./use-widget-bundle";

describe("buildBundleRequestPath", () => {
  it("includes component id", () => {
    const path = buildBundleRequestPath("poi-map", "");
    assert.equal(path, "/api/workbench/bundle?id=poi-map");
  });

  it("forwards demo=true from current location search", () => {
    const path = buildBundleRequestPath("poi-map", "?demo=true");
    assert.equal(path, "/api/workbench/bundle?id=poi-map&demo=true");
  });

  it("ignores unrelated query params", () => {
    const path = buildBundleRequestPath(
      "welcome",
      "?component=welcome&foo=bar",
    );
    assert.equal(path, "/api/workbench/bundle?id=welcome");
  });
});
