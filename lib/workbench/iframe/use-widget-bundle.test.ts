import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBundleCacheKey,
  buildBundleRequestPath,
  buildHmrPreviewPath,
} from "./use-widget-bundle";

describe("buildBundleRequestPath", () => {
  it("includes component id", () => {
    const path = buildBundleRequestPath("poi-map", "", "development");
    assert.equal(path, "/api/workbench/bundle?id=poi-map");
  });

  it("uses a fresh demo API bundle in development when demo=true is present", () => {
    const path = buildBundleRequestPath("poi-map", "?demo=true", "development");
    assert.equal(path, "/api/workbench/bundle?id=poi-map&demo=true");
  });

  it("uses static bundles for demo mode in production", () => {
    const path = buildBundleRequestPath("poi-map", "?demo=true", "production");
    assert.equal(path, "/workbench-bundles/poi-map.js");
  });

  it("uses static bundles for non-demo mode in production", () => {
    const path = buildBundleRequestPath("poi-map", "", "production");
    assert.equal(path, "/workbench-bundles/poi-map.js");
  });

  it("ignores unrelated query params", () => {
    const path = buildBundleRequestPath(
      "welcome",
      "?component=welcome&foo=bar",
      "development",
    );
    assert.equal(path, "/api/workbench/bundle?id=welcome");
  });
});

describe("buildBundleCacheKey", () => {
  it("separates cache keys for demo and non-demo modes", () => {
    const demoKey = buildBundleCacheKey("poi-map", "?demo=true", "development");
    const devKey = buildBundleCacheKey("poi-map", "", "development");

    assert.notEqual(demoKey, devKey);
  });

  it("separates production static and development runtime cache keys", () => {
    const staticKey = buildBundleCacheKey("poi-map", "", "production");
    const devKey = buildBundleCacheKey("poi-map", "", "development");

    assert.notEqual(staticKey, devKey);
  });
});

describe("buildHmrPreviewPath", () => {
  it("builds preview URL for selected component", () => {
    const path = buildHmrPreviewPath("poi-map", "");
    assert.equal(
      path,
      "/__workbench_hmr/lib/workbench/hmr/preview.html?component=poi-map&mcp-host=",
    );
  });
});
