import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as esbuild from "esbuild";
import type { ComponentConfig } from "./component-map";

function toAliasImportPath(projectRelativePath: string): string {
  const normalizedPath = projectRelativePath.replace(/\\/g, "/");
  return normalizedPath.startsWith("@/")
    ? normalizedPath
    : `@/${normalizedPath}`;
}

const ENTRY_TEMPLATE_WITH_PROVIDER = `
import React from "react";
import { createRoot } from "react-dom/client";
import { ProductionProvider } from "@/lib/export/production-provider";
WIDGET_IMPORT_LINE

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

const ENTRY_TEMPLATE_NO_PROVIDER = `
import React from "react";
import { createRoot } from "react-dom/client";
WIDGET_IMPORT_LINE

function App() {
  return React.createElement(Widget, null);
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(React.createElement(App));
}
`.trim();

export type MkdirFn = (
  dirPath: string,
  options: { recursive: true },
) => Promise<string | undefined>;
type TmpDirFn = () => string;

export async function ensureWorkbenchTempDir(
  projectRoot: string,
  mkdir: MkdirFn = (dirPath, options) => fs.mkdir(dirPath, options),
  getTmpDir: TmpDirFn = os.tmpdir,
): Promise<string> {
  const projectTempDir = path.join(projectRoot, ".workbench-temp");

  try {
    await mkdir(projectTempDir, { recursive: true });
    return projectTempDir;
  } catch {
    const fallbackTempDir = path.join(
      getTmpDir(),
      "mcp-app-studio-workbench-temp",
    );
    await mkdir(fallbackTempDir, { recursive: true });
    return fallbackTempDir;
  }
}

export function createBundleBuildOptions(
  projectRoot: string,
  entryPath: string,
  options?: { minify?: boolean; nodeEnv?: "development" | "production" },
): esbuild.BuildOptions {
  const minify = options?.minify ?? false;
  const nodeEnv = options?.nodeEnv ?? "development";

  return {
    absWorkingDir: projectRoot,
    entryPoints: [entryPath],
    bundle: true,
    minify,
    format: "esm",
    target: ["es2020"],
    write: false,
    outdir: path.dirname(entryPath),
    entryNames: "entry",
    nodePaths: [path.join(projectRoot, "node_modules")],
    loader: {
      ".tsx": "tsx",
      ".ts": "ts",
      ".jsx": "jsx",
      ".js": "js",
      ".css": "css",
      ".png": "dataurl",
      ".jpg": "dataurl",
      ".svg": "dataurl",
      ".gif": "dataurl",
    },
    alias: {
      "@": projectRoot,
    },
    external: [],
    define: {
      "process.env.NODE_ENV": JSON.stringify(nodeEnv),
    },
    jsx: "automatic",
    jsxImportSource: "react",
  };
}

function buildEntryTemplate(useProductionProvider: boolean): string {
  return useProductionProvider
    ? ENTRY_TEMPLATE_WITH_PROVIDER
    : ENTRY_TEMPLATE_NO_PROVIDER;
}

function inlineCssIntoBundle(jsBundle: string, cssBundle?: string): string {
  if (!cssBundle) return jsBundle;

  const inlinedCssBootstrap = [
    "(() => {",
    `  const css = ${JSON.stringify(cssBundle)};`,
    "  const style = document.createElement('style');",
    "  style.setAttribute('data-workbench-inline-css', 'true');",
    "  style.textContent = css;",
    "  document.head.appendChild(style);",
    "})();",
  ].join("\n");

  return `${inlinedCssBootstrap}\n${jsBundle}`;
}

export async function buildComponentBundle(
  projectRoot: string,
  config: ComponentConfig,
  options?: { minify?: boolean; nodeEnv?: "development" | "production" },
): Promise<string> {
  return buildBundle(projectRoot, config, options, true);
}

export async function buildDemoBundle(
  projectRoot: string,
  config: ComponentConfig,
  options?: { minify?: boolean; nodeEnv?: "development" | "production" },
): Promise<string> {
  return buildBundle(projectRoot, config, options, false);
}

async function buildBundle(
  projectRoot: string,
  config: ComponentConfig,
  options: { minify?: boolean; nodeEnv?: "development" | "production" } = {},
  useProductionProvider: boolean,
): Promise<string> {
  const tempDir = await ensureWorkbenchTempDir(projectRoot);
  const widgetImportPath = toAliasImportPath(config.entryFile);
  const importLine = config.exportName
    ? `import { ${config.exportName} as Widget } from "${widgetImportPath}";`
    : `import Widget from "${widgetImportPath}";`;

  const entryPath = path.join(tempDir, `entry-${crypto.randomUUID()}.tsx`);
  const entryTemplate = buildEntryTemplate(useProductionProvider);
  const entryContent = entryTemplate.replace("WIDGET_IMPORT_LINE", importLine);

  try {
    await fs.writeFile(entryPath, entryContent, "utf-8");

    const result = await esbuild.build(
      createBundleBuildOptions(projectRoot, entryPath, options),
    );

    if (result.errors.length > 0) {
      const errorMessages = result.errors
        .map((e) => `${e.location?.file ?? ""}:${e.text}`)
        .join("\n");
      throw new Error(`Build failed with errors:\n${errorMessages}`);
    }

    const jsBundle = result.outputFiles?.find((file) =>
      file.path.endsWith(".js"),
    )?.text;
    if (!jsBundle) {
      throw new Error("Build failed: missing JavaScript output");
    }

    const cssBundle = result.outputFiles?.find((file) =>
      file.path.endsWith(".css"),
    )?.text;

    return inlineCssIntoBundle(jsBundle, cssBundle);
  } finally {
    await fs.unlink(entryPath).catch(() => undefined);
  }
}
