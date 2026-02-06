import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  getWorkbenchComponentConfig,
  getWorkbenchComponentEntries,
} from "./component-map";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
});

describe("getWorkbenchComponentConfig", () => {
  it("returns undefined when the mapped entry file does not exist", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "component-map-"));
    const wrappersDir = path.join(tempDir, "lib/workbench/wrappers");
    await fs.mkdir(wrappersDir, { recursive: true });
    await fs.writeFile(
      path.join(wrappersDir, "poi-map-sdk.tsx"),
      "export const POIMapSDK = () => null;\n",
      "utf-8",
    );

    process.chdir(tempDir);

    assert.equal(getWorkbenchComponentConfig("welcome"), undefined);
    assert.deepEqual(getWorkbenchComponentConfig("poi-map"), {
      entryFile: "lib/workbench/wrappers/poi-map-sdk.tsx",
      exportName: "POIMapSDK",
    });
    assert.deepEqual(getWorkbenchComponentEntries(), [
      [
        "poi-map",
        {
          entryFile: "lib/workbench/wrappers/poi-map-sdk.tsx",
          exportName: "POIMapSDK",
        },
      ],
    ]);
  });
});
