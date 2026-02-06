import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getWorkbenchDemoComponentConfig,
  getWorkbenchDemoComponentEntries,
} from "./demo-component-map";

describe("demo-component-map", () => {
  it("includes the expected demo component ids", () => {
    const entries = getWorkbenchDemoComponentEntries();
    const ids = entries.map(([id]) => id).sort();
    assert.deepEqual(ids, ["poi-map", "welcome"]);
  });

  it("resolves poi-map demo config", () => {
    const config = getWorkbenchDemoComponentConfig("poi-map");
    assert.ok(config);
    assert.equal(config.entryFile, "lib/workbench/demo/poi-map-demo.tsx");
    assert.equal(config.exportName, "POIMapDemo");
  });
});
