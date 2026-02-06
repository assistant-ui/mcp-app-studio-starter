import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDemoBundle } from "./build-component-bundle";
import { getWorkbenchDemoComponentConfig } from "./demo-component-map";

describe("buildDemoBundle", () => {
  it("builds a static poi-map demo bundle without ProductionProvider", async () => {
    const config = getWorkbenchDemoComponentConfig("poi-map");
    assert.ok(config);

    const bundle = await buildDemoBundle(process.cwd(), config, {
      minify: false,
      nodeEnv: "production",
    });

    assert.equal(bundle.includes("ProductionProvider"), false);
    assert.equal(bundle.includes("useToolInput"), false);
    assert.equal(bundle.includes("San Francisco Highlights"), true);
  });
});
