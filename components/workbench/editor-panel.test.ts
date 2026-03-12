import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const TARGET_FILE = path.resolve(
  process.cwd(),
  "components/workbench/editor-panel.tsx",
);

describe("EditorPanel", () => {
  it("surfaces App Props and App State, but not Private Metadata", () => {
    const source = fs.readFileSync(TARGET_FILE, "utf8");

    assert.match(source, /title:\s*"App Props"/);
    assert.match(source, /title:\s*"App State"/);
    assert.doesNotMatch(source, /title:\s*"Private Metadata"/);
    assert.doesNotMatch(source, /toolResponseMetadataController/);
  });
});
