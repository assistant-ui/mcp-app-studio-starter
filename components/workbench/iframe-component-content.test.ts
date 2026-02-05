import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const TARGET_FILE = path.resolve(
  process.cwd(),
  "components/workbench/iframe-component-content.tsx",
);

describe("IframeComponentContent regression coverage", () => {
  it("wraps iframe preview content in ComponentErrorBoundary", () => {
    const source = fs.readFileSync(TARGET_FILE, "utf8");

    expect(source).toContain("ComponentErrorBoundary");
    expect(source).toContain("useToolInput");
    expect(source).toMatch(
      /<ComponentErrorBoundary\s+toolInput=\{toolInput\}>[\s\S]*<IframeComponentRenderer\s*\/>[\s\S]*<\/ComponentErrorBoundary>/,
    );
  });
});
