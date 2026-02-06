#!/usr/bin/env tsx

import fs from "node:fs/promises";
import path from "node:path";
import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";
import { buildDemoBundle } from "../lib/workbench/bundles/build-component-bundle";
import { getWorkbenchDemoComponentEntries } from "../lib/workbench/bundles/component-map";

interface DemoBundleManifest {
  generatedAt: string;
  bundles: Record<string, string>;
  css: string;
}

async function buildDemoCss(
  projectRoot: string,
  outputDir: string,
): Promise<string> {
  const globalsPath = path.join(projectRoot, "app", "globals.css");
  const sourceCss = await fs.readFile(globalsPath, "utf-8");
  const compiled = await postcss([tailwindcss()]).process(sourceCss, {
    from: globalsPath,
  });

  const cssFileName = "demo.css";
  const cssRelativePath = `/workbench-bundles/${cssFileName}`;
  await fs.writeFile(path.join(outputDir, cssFileName), compiled.css, "utf-8");
  return cssRelativePath;
}

async function buildDemoBundles() {
  const projectRoot = process.cwd();
  const outputDir = path.join(projectRoot, "public", "workbench-bundles");

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const manifest: DemoBundleManifest = {
    generatedAt: new Date().toISOString(),
    bundles: {},
    css: "",
  };

  const componentEntries = getWorkbenchDemoComponentEntries(projectRoot).sort(
    ([a], [b]) => a.localeCompare(b),
  );

  if (componentEntries.length === 0) {
    throw new Error(
      "No demo components found. Ensure lib/workbench/demo contains demo wrappers.",
    );
  }

  for (const [componentId, config] of componentEntries) {
    const bundle = await buildDemoBundle(projectRoot, config, {
      minify: true,
      nodeEnv: "production",
    });

    const fileName = `${componentId}.js`;
    const relativePath = `/workbench-bundles/${fileName}`;
    await fs.writeFile(path.join(outputDir, fileName), bundle, "utf-8");
    manifest.bundles[componentId] = relativePath;
    console.log(`✓ built ${relativePath}`);
  }

  manifest.css = await buildDemoCss(projectRoot, outputDir);
  console.log(`✓ built ${manifest.css}`);

  await fs.writeFile(
    path.join(outputDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf-8",
  );

  console.log(`✓ wrote /workbench-bundles/manifest.json`);
}

buildDemoBundles().catch((error) => {
  console.error("Failed to build demo bundles:", error);
  process.exit(1);
});
