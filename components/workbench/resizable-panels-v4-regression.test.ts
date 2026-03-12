import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";

const PREVIEW_VIEWS = path.resolve(
  process.cwd(),
  "components/workbench/preview-views.tsx",
);
const WORKBENCH_LAYOUT = path.resolve(
  process.cwd(),
  "components/workbench/workbench-layout.tsx",
);

describe("react-resizable-panels v4 compatibility", () => {
  it("uses the v4 Group/Separator API in preview-views", () => {
    const source = fs.readFileSync(PREVIEW_VIEWS, "utf8");

    assert.match(source, /Group,/);
    assert.match(source, /Separator,/);
    assert.doesNotMatch(source, /\bPanelGroup\b/);
    assert.doesNotMatch(source, /\bPanelResizeHandle\b/);
  });

  it("uses the v4 Group/Separator API in workbench-layout", () => {
    const source = fs.readFileSync(WORKBENCH_LAYOUT, "utf8");

    assert.match(source, /Group,/);
    assert.match(source, /Separator,/);
    assert.doesNotMatch(source, /\bPanelGroup\b/);
    assert.doesNotMatch(source, /\bPanelResizeHandle\b/);
  });
});
