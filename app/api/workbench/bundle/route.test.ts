import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import * as esbuild from "esbuild";
import { NextRequest } from "next/server";
import { createBundleBuildOptions, ensureWorkbenchTempDir, GET } from "./route";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

describe("GET /api/workbench/bundle", () => {
  it("blocks production requests without demo mode", async () => {
    process.env.NODE_ENV = "production";
    const request = new NextRequest("http://localhost/api/workbench/bundle");
    const response = await GET(request);

    assert.equal(response.status, 403);
    assert.match(await response.text(), /only available in development/i);
  });

  it("allows production demo requests to continue past env gate", async () => {
    process.env.NODE_ENV = "production";
    const request = new NextRequest(
      "http://localhost/api/workbench/bundle?demo=true",
    );
    const response = await GET(request);

    // If demo mode is permitted in production, the route should continue and
    // fail on missing component id validation instead of the env gate.
    assert.equal(response.status, 400);
    assert.match(await response.text(), /missing component id parameter/i);
  });
});

describe("ensureWorkbenchTempDir", () => {
  it("falls back to OS temp dir when project temp dir creation fails", async () => {
    const projectRoot = "/var/task";
    const attemptedDirs: string[] = [];
    const fallbackTmpDir = "/tmp";

    const mkdir = async (
      dirPath: string,
      _options: { recursive: true },
    ): Promise<string | undefined> => {
      attemptedDirs.push(dirPath);
      if (dirPath === path.join(projectRoot, ".workbench-temp")) {
        const error = new Error(
          "ENOENT: no such file or directory, mkdir '/var/task/.workbench-temp'",
        ) as NodeJS.ErrnoException;
        error.code = "ENOENT";
        throw error;
      }
      return undefined;
    };

    const tempDir = await ensureWorkbenchTempDir(
      projectRoot,
      mkdir,
      () => fallbackTmpDir,
    );

    assert.equal(
      tempDir,
      path.join(fallbackTmpDir, "mcp-app-studio-workbench-temp"),
    );
    assert.deepEqual(attemptedDirs, [
      path.join(projectRoot, ".workbench-temp"),
      path.join(fallbackTmpDir, "mcp-app-studio-workbench-temp"),
    ]);
  });
});

describe("createBundleBuildOptions", () => {
  it("resolves package imports when entry lives outside project root", async () => {
    const projectRoot = process.cwd();
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "mcp-app-studio-bundle-test-"),
    );
    const entryPath = path.join(tempDir, "entry.tsx");
    await fs.writeFile(
      entryPath,
      'import React from "react";\nconsole.log(React);',
    );

    await assert.doesNotReject(async () => {
      const result = await esbuild.build(
        createBundleBuildOptions(projectRoot, entryPath),
      );
      assert.ok(result.outputFiles?.[0]?.text);
    });
  });

  it("bundles poi-map wrapper from OS temp entry directory", async () => {
    const projectRoot = process.cwd();
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "mcp-app-studio-bundle-test-"),
    );
    const entryPath = path.join(tempDir, "entry.tsx");
    const entryContent = `
import React from "react";
import { createRoot } from "react-dom/client";
import { ProductionProvider } from "@/lib/export/production-provider";
import { POIMapSDK as Widget } from "@/lib/workbench/wrappers/poi-map-sdk.tsx";

function App() {
  return React.createElement(
    ProductionProvider,
    null,
    React.createElement(Widget, null)
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(React.createElement(App));
}
`.trim();

    await fs.writeFile(entryPath, entryContent);

    await assert.doesNotReject(async () => {
      const result = await esbuild.build(
        createBundleBuildOptions(projectRoot, entryPath),
      );
      assert.ok(result.outputFiles?.[0]?.text);
    });
  });
});
