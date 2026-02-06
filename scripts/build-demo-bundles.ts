#!/usr/bin/env tsx

import fs from "node:fs/promises";
import path from "node:path";
import { buildComponentBundle } from "../lib/workbench/bundles/build-component-bundle";
import { WORKBENCH_COMPONENT_MAP } from "../lib/workbench/bundles/component-map";

interface DemoBundleManifest {
  generatedAt: string;
  bundles: Record<string, string>;
}

async function buildDemoBundles() {
  const projectRoot = process.cwd();
  const outputDir = path.join(projectRoot, "public", "workbench-bundles");

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const manifest: DemoBundleManifest = {
    generatedAt: new Date().toISOString(),
    bundles: {},
  };

  const componentEntries = Object.entries(WORKBENCH_COMPONENT_MAP).sort(
    ([a], [b]) => a.localeCompare(b),
  );

  for (const [componentId, config] of componentEntries) {
    const bundle = await buildComponentBundle(projectRoot, config, {
      minify: true,
      nodeEnv: "production",
    });

    const fileName = `${componentId}.js`;
    const relativePath = `/workbench-bundles/${fileName}`;
    await fs.writeFile(path.join(outputDir, fileName), bundle, "utf-8");
    manifest.bundles[componentId] = relativePath;
    console.log(`✓ built ${relativePath}`);
  }

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
