import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { scanForUnsafeRequestModalUsage } from "./request-modal-guardrail";

describe("scanForUnsafeRequestModalUsage", () => {
  it("warns on direct window.openai.requestModal calls", async () => {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "mcp-app-studio-modal-guardrail-"),
    );

    try {
      await fs.mkdir(path.join(tempDir, "components"), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, "components", "widget.tsx"),
        `export async function open() {\n  await window.openai.requestModal({ title: "Details" });\n}\n`,
        "utf-8",
      );

      const warnings = await scanForUnsafeRequestModalUsage(tempDir);

      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /components\/widget\.tsx:2/);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("does not warn when requestModal is feature-detected", async () => {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "mcp-app-studio-modal-guardrail-"),
    );

    try {
      await fs.mkdir(path.join(tempDir, "components"), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, "components", "widget.tsx"),
        `export async function open() {\n  if (window.openai?.requestModal) {\n    await window.openai?.requestModal({ title: "Details" });\n  }\n}\n`,
        "utf-8",
      );

      const warnings = await scanForUnsafeRequestModalUsage(tempDir);

      assert.equal(warnings.length, 0);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
