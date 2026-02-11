#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import type { ExportConfig } from "../lib/export";
import {
  createDefaultExportConfig,
  exportWidget,
  generateExportSummary,
  printExportSummary,
} from "../lib/export";

interface StudioConfig {
  widget?: {
    entryPoint?: string;
    exportName?: string;
    name?: string;
  };
}

interface ExportArgs {
  entryPoint: string;
  exportName: string;
  name: string;
  description?: string;
  outputDir: string;
  inline: boolean;
}

function loadStudioConfig(projectRoot: string): StudioConfig | null {
  const configPath = path.join(projectRoot, "mcp-app-studio.config.json");
  if (!fs.existsSync(configPath)) return null;

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as StudioConfig;
  } catch {
    // Ignore config parse errors here; export will still work with defaults/flags.
    return null;
  }
}

function readPackageDescription(projectRoot: string): string | undefined {
  try {
    const pkgPath = path.join(projectRoot, "package.json");
    if (!fs.existsSync(pkgPath)) return undefined;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
      description?: unknown;
    };
    const desc =
      typeof pkg.description === "string" ? pkg.description.trim() : "";
    return desc.length > 0 ? desc : undefined;
  } catch {
    return undefined;
  }
}

function getDefaultArgs(projectRoot: string): ExportArgs {
  const config = loadStudioConfig(projectRoot);
  const widget = config?.widget;

  return {
    entryPoint: widget?.entryPoint ?? "lib/workbench/wrappers/poi-map-sdk.tsx",
    exportName: widget?.exportName ?? "POIMapSDK",
    name: widget?.name ?? "My MCP App",
    outputDir: "export",
    inline: false,
  };
}

function parseArgs(defaults: ExportArgs): ExportArgs {
  const args = process.argv.slice(2);
  const parsed: ExportArgs = { ...defaults };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case "--entry":
      case "-e":
        if (next) parsed.entryPoint = next;
        i++;
        break;
      case "--export-name":
        if (next) parsed.exportName = next;
        i++;
        break;
      case "--name":
      case "-n":
        if (next) parsed.name = next;
        i++;
        break;
      case "--description":
      case "-d":
        if (next) parsed.description = next;
        i++;
        break;
      case "--output":
      case "-o":
        if (next) parsed.outputDir = next;
        i++;
        break;
      case "--inline":
        parsed.inline = true;
        break;
      case "--help":
      case "-h":
        printHelp(defaults);
        process.exit(0);
    }
  }

  return parsed;
}

function printHelp(defaults: ExportArgs) {
  console.log(`
Usage: tsx scripts/export.ts [options]

Options:
  -e, --entry <path>      Widget entry point (default: ${defaults.entryPoint})
  --export-name <name>    Export name from entry file (default: ${defaults.exportName})
  -n, --name <name>       App name for manifest (default: ${defaults.name})
  -d, --description <text> App description for manifest (default: from package.json)
  -o, --output <dir>      Output directory (default: export)
  --inline                Inline JS/CSS into HTML
  -h, --help              Show this help message

Examples:
  tsx scripts/export.ts
  tsx scripts/export.ts --name "My Widget" --output dist
  tsx scripts/export.ts -e src/widgets/custom.tsx --export-name CustomWidget
`);
}

async function main() {
  const projectRoot = process.cwd();
  const defaults = getDefaultArgs(projectRoot);
  const args = parseArgs(defaults);

  console.log("\n🚀 MCP App Export\n");
  console.log(`   Entry: ${args.entryPoint}`);
  console.log(`   Export: ${args.exportName}`);
  console.log(`   Name: ${args.name}`);
  console.log(`   Output: ${args.outputDir}`);
  console.log("");

  const config: ExportConfig = {
    ...createDefaultExportConfig(args.entryPoint, args.name),
    widget: {
      entryPoint: args.entryPoint,
      exportName: args.exportName,
      name: args.name,
    },
    output: {
      dir: args.outputDir,
      inline: args.inline,
    },
  };

  // CLI --description flag takes priority, then package.json description
  const description =
    args.description ?? readPackageDescription(projectRoot);
  if (description && !config.manifest?.description) {
    config.manifest = {
      ...config.manifest,
      description,
    };
  }

  const result = await exportWidget({
    config,
    projectRoot,
  });

  if (!result.success) {
    console.error("\n❌ Export failed:\n");
    for (const error of result.errors) {
      console.error(`   ${error}`);
    }
    process.exit(1);
  }

  if (result.manifest) {
    const summary = generateExportSummary(result.files, result.manifest, false);
    printExportSummary(summary);

    if (result.warnings.length > 0) {
      console.log("\n⚠️  Export warnings:");
      for (const warning of result.warnings) {
        console.log(`   ${warning}`);
      }
    }

    if (summary.manifestValidation.errors.length > 0) {
      process.exit(1);
    }
  } else {
    console.log("\n📁 Generated files:");
    for (const file of result.files) {
      const sizeKb = (file.size / 1024).toFixed(1);
      console.log(`   ${file.relativePath} (${sizeKb} KB)`);
    }
  }

  console.log("\n✨ Done!\n");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
