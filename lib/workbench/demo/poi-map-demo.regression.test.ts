import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const TARGET_FILE = path.resolve(
  process.cwd(),
  "lib/workbench/demo/poi-map-demo.tsx",
);

describe("POI map demo regression", () => {
  it("does not hardcode dark theme", () => {
    const source = fs.readFileSync(TARGET_FILE, "utf8");

    assert.equal(source.includes('theme="dark"'), false);
  });

  it("syncs to host globals updates", () => {
    const source = fs.readFileSync(TARGET_FILE, "utf8");

    assert.equal(source.includes("openai:set_globals"), true);
  });
});
