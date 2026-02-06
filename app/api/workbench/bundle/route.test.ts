import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { NextRequest } from "next/server";
import { ensureWorkbenchTempDir, GET } from "./route";

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
