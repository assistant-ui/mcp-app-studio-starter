import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as esbuild from "esbuild";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function toAliasImportPath(projectRelativePath: string): string {
  const normalizedPath = projectRelativePath.replace(/\\/g, "/");
  return normalizedPath.startsWith("@/")
    ? normalizedPath
    : `@/${normalizedPath}`;
}

const ENTRY_TEMPLATE = `
import React from "react";
import { createRoot } from "react-dom/client";
import { ProductionProvider } from "@/lib/export/production-provider";
WIDGET_IMPORT_LINE

function App() {
  return React.createElement(
    ProductionProvider,
    null,
    // Tool input should be read from the host via SDK hooks (e.g. useToolInput()).
    // In the local workbench we simulate the ChatGPT extensions API ("window.openai")
    // so the universal SDK can still function, but we don't pass toolInput as props.
    React.createElement(Widget, null)
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(React.createElement(App));
}
`.trim();

interface ComponentConfig {
  entryFile: string;
  exportName?: string;
}

const COMPONENT_MAP: Record<string, ComponentConfig> = {
  welcome: {
    entryFile: "lib/workbench/wrappers/welcome-card-sdk.tsx",
    exportName: "WelcomeCardSDK",
  },
  "poi-map": {
    entryFile: "lib/workbench/wrappers/poi-map-sdk.tsx",
    exportName: "POIMapSDK",
  },
};

const bundleCache = new Map<string, { bundle: string; timestamp: number }>();
const CACHE_TTL = 5000;

type MkdirFn = (
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
): esbuild.BuildOptions {
  return {
    absWorkingDir: projectRoot,
    entryPoints: [entryPath],
    bundle: true,
    minify: false,
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
      "process.env.NODE_ENV": '"development"',
    },
    jsx: "automatic",
    jsxImportSource: "react",
  };
}

export async function GET(request: NextRequest) {
  const isDemoRequest = request.nextUrl.searchParams.get("demo") === "true";

  if (process.env.NODE_ENV !== "development" && !isDemoRequest) {
    return NextResponse.json(
      {
        error:
          "This endpoint is only available in development. Run the workbench locally with `npm run dev`.",
      },
      { status: 403 },
    );
  }

  const componentId = request.nextUrl.searchParams.get("id");

  if (!componentId) {
    return NextResponse.json(
      { error: "Missing component id parameter" },
      { status: 400 },
    );
  }

  const config = COMPONENT_MAP[componentId];
  if (!config) {
    return NextResponse.json(
      { error: `Unknown component: ${componentId}` },
      { status: 404 },
    );
  }

  const cacheKey = componentId;
  const cached = bundleCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(cached.bundle, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache",
      },
    });
  }

  try {
    const projectRoot = process.cwd();
    const tempDir = await ensureWorkbenchTempDir(projectRoot);

    const widgetImportPath = toAliasImportPath(config.entryFile);

    const importLine = config.exportName
      ? `import { ${config.exportName} as Widget } from "${widgetImportPath}";`
      : `import Widget from "${widgetImportPath}";`;

    const entryContent = ENTRY_TEMPLATE.replace(
      "WIDGET_IMPORT_LINE",
      importLine,
    );
    const entryPath = path.join(tempDir, `entry-${crypto.randomUUID()}.tsx`);
    await fs.writeFile(entryPath, entryContent, "utf-8");

    const result = await esbuild.build(
      createBundleBuildOptions(projectRoot, entryPath),
    );

    if (result.errors.length > 0) {
      const errorMessages = result.errors
        .map((e) => `${e.location?.file ?? ""}:${e.text}`)
        .join("\n");
      return NextResponse.json(
        { error: `Bundle failed: ${errorMessages}` },
        { status: 500 },
      );
    }

    const jsBundle = result.outputFiles?.find((file) =>
      file.path.endsWith(".js"),
    )?.text;
    if (!jsBundle) {
      return NextResponse.json(
        { error: "Bundle failed: missing JavaScript output" },
        { status: 500 },
      );
    }

    const cssBundle = result.outputFiles?.find((file) =>
      file.path.endsWith(".css"),
    )?.text;

    let bundle = jsBundle;
    if (cssBundle) {
      const inlinedCssBootstrap = [
        "(() => {",
        `  const css = ${JSON.stringify(cssBundle)};`,
        "  const style = document.createElement('style');",
        "  style.setAttribute('data-workbench-inline-css', 'true');",
        "  style.textContent = css;",
        "  document.head.appendChild(style);",
        "})();",
      ].join("\n");
      bundle = `${inlinedCssBootstrap}\n${jsBundle}`;
    }

    bundleCache.set(cacheKey, { bundle, timestamp: Date.now() });

    try {
      await fs.unlink(entryPath);
    } catch {
      // Ignore cleanup errors
    }

    return new NextResponse(bundle, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Bundle failed: ${message}` },
      { status: 500 },
    );
  }
}
