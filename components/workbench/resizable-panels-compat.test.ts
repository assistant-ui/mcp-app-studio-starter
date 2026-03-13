import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";

const PREVIEW_VIEWS_FILE = path.resolve(
  process.cwd(),
  "components/workbench/preview-views.tsx",
);
const WORKBENCH_LAYOUT_FILE = path.resolve(
  process.cwd(),
  "components/workbench/workbench-layout.tsx",
);

describe("workbench resizable-panels compatibility", () => {
  it("uses the v4 Group/Separator surface in preview-views", () => {
    const source = fs.readFileSync(PREVIEW_VIEWS_FILE, "utf8");

    assert.match(source, /\bGroup\b/);
    assert.match(source, /\bSeparator\b/);
    assert.match(source, /\bGroupImperativeHandle\b/);
    assert.match(source, /groupRef=\{/);
    assert.match(source, /orientation="horizontal"/);

    assert.doesNotMatch(source, /\bPanelGroup\b/);
    assert.doesNotMatch(source, /\bPanelResizeHandle\b/);
    assert.doesNotMatch(source, /\bImperativePanelGroupHandle\b/);
  });

  it("keeps preview panel sizes in percentage units under v4 semantics", () => {
    const source = fs.readFileSync(PREVIEW_VIEWS_FILE, "utf8");

    assert.match(source, /defaultSize="0%"/);
    assert.match(source, /defaultSize="100%"/);
    assert.match(
      source,
      /minSize=\{showResizeHandles \? `\$\{PREVIEW_MIN_SIZE\}%` : "0%"\}/,
    );
    assert.match(source, /maxSize=\{`\$\{PREVIEW_MAX_SIZE\}%`\}/);
    assert.doesNotMatch(source, /defaultSize=\{90\}/);
    assert.doesNotMatch(source, /defaultSize=\{5\}/);
  });

  it("keeps workspace panel sizes in percentage units under v4 semantics", () => {
    const source = fs.readFileSync(WORKBENCH_LAYOUT_FILE, "utf8");

    assert.match(source, /const DEFAULT_SIDE_PANEL_SIZE = "25%"/);
    assert.match(source, /const DEFAULT_PREVIEW_PANEL_SIZE = "50%"/);
    assert.match(source, /const SIDE_PANEL_MIN_SIZE = "20%"/);
    assert.match(source, /const SIDE_PANEL_MAX_SIZE = "40%"/);
    assert.match(source, /const PREVIEW_PANEL_MIN_SIZE = "30%"/);
    assert.match(source, /resize\(DEFAULT_SIDE_PANEL_SIZE\)/);
    assert.doesNotMatch(source, /defaultSize=\{25\}/);
    assert.doesNotMatch(source, /defaultSize=\{50\}/);
  });
});
