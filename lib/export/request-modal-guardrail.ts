import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".vercel",
  ".export-temp",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "export",
]);

async function collectSourceFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          await walk(fullPath);
        }
        continue;
      }

      if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

export async function scanForUnsafeRequestModalUsage(
  projectRoot: string,
): Promise<string[]> {
  const sourceFiles = await collectSourceFiles(projectRoot);
  const warnings: string[] = [];

  const unsafePattern = /window\.openai\.requestModal\s*\(/;

  for (const filePath of sourceFiles) {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (!unsafePattern.test(line)) return;
      const relativePath = path.relative(projectRoot, filePath);

      warnings.push(
        `Unsafe ChatGPT-only modal call detected at ${relativePath}:${index + 1}. ` +
          "Use feature detection (window.openai?.requestModal) with a local fallback for non-ChatGPT hosts.",
      );
    });
  }

  return warnings;
}
