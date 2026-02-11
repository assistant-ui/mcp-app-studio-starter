import fs from "node:fs/promises";
import path from "node:path";
import { bundleWidget } from "./bundler";
import { writeHtml } from "./generate-html";
import { generateManifest, stringifyManifest } from "./generate-manifest";
import { generateReadme } from "./generate-readme";
import {
  extractToolsFromMockConfig,
  generateMCPServer,
  type MCPToolConfig,
} from "./mcp-server";
import { scanForUnsafeRequestModalUsage } from "./request-modal-guardrail";
import type { ExportConfig, ExportedFile, ExportResult } from "./types";

export type { MCPServerConfig, MCPToolConfig } from "./mcp-server";
export type {
  ChatGPTAppManifest,
  ExportConfig,
  ExportedFile,
  ExportResult,
  ManifestConfig,
  ToolManifest,
} from "./types";
export { generateMCPServer, extractToolsFromMockConfig };
export {
  analyzeBundleSize,
  type BundleSizeAnalysis,
  type ExportSummary,
  formatSize,
  generateExportSummary,
  printExportSummary,
  type ValidationResult,
  validateManifest,
} from "./validate";

export interface ExportOptions {
  config: ExportConfig;
  projectRoot?: string;
  includeServer?: boolean;
  serverConfig?: {
    name?: string;
    version?: string;
    tools?: MCPToolConfig[];
    mockConfig?: Record<string, unknown>;
  };
}

export async function exportWidget(
  options: ExportOptions,
): Promise<ExportResult> {
  const { config } = options;
  const projectRoot = options.projectRoot ?? process.cwd();
  const outputDir = path.resolve(projectRoot, config.output.dir);

  const files: ExportedFile[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    await fs.mkdir(outputDir, { recursive: true });

    console.log("📦 Bundling widget...");
    const bundleResult = await bundleWidget(config, projectRoot);

    if (!bundleResult.success) {
      errors.push(...bundleResult.errors);
      return {
        success: false,
        outputDir,
        files,
        errors,
        warnings,
      };
    }

    const isInline = config.output.inline ?? false;

    // In inline mode, JS/CSS are embedded in the HTML — no need for separate files.
    if (!isInline) {
      if (bundleResult.jsFile) {
        files.push(bundleResult.jsFile);
      }
      if (bundleResult.cssFile) {
        files.push(bundleResult.cssFile);
      }
    }

    const modalGuardWarnings =
      await scanForUnsafeRequestModalUsage(projectRoot);
    warnings.push(...modalGuardWarnings);

    console.log("📄 Generating HTML...");
    const htmlPath = path.join(outputDir, "widget", "index.html");
    const widgetName = config.manifest?.name ?? config.widget.name ?? "MCP App";

    await writeHtml({
      outputPath: htmlPath,
      title: widgetName,
      jsPath: "./widget.js",
      cssPath: bundleResult.cssFile ? "./widget.css" : undefined,
      jsBundlePath: bundleResult.jsFile?.path,
      cssBundlePath: bundleResult.cssFile?.path,
      inline: isInline,
    });

    // In inline mode, remove the separate JS/CSS files since they're embedded in the HTML.
    if (isInline) {
      if (bundleResult.jsFile) {
        await fs.unlink(bundleResult.jsFile.path).catch(() => {});
      }
      if (bundleResult.cssFile) {
        await fs.unlink(bundleResult.cssFile.path).catch(() => {});
      }
    }

    const htmlStat = await fs.stat(htmlPath);
    files.push({
      path: htmlPath,
      relativePath: "widget/index.html",
      size: htmlStat.size,
    });

    console.log("📋 Generating manifest...");
    const manifest = generateManifest({
      config,
      widgetUrl: "https://YOUR_DEPLOYED_URL/index.html",
    });
    const manifestContent = stringifyManifest(manifest);
    const manifestPath = path.join(outputDir, "manifest.json");
    await fs.writeFile(manifestPath, manifestContent, "utf-8");

    const manifestStat = await fs.stat(manifestPath);
    files.push({
      path: manifestPath,
      relativePath: "manifest.json",
      size: manifestStat.size,
    });

    console.log("📖 Generating README...");
    const readme = generateReadme({
      config,
      manifest,
      files: files.map((f) => f.relativePath),
    });
    const readmePath = path.join(outputDir, "README.md");
    await fs.writeFile(readmePath, readme, "utf-8");

    const readmeStat = await fs.stat(readmePath);
    files.push({
      path: readmePath,
      relativePath: "README.md",
      size: readmeStat.size,
    });

    // Generate MCP server if requested
    if (options.includeServer) {
      console.log("🖥️  Generating MCP server...");

      const serverName =
        options.serverConfig?.name ?? config.manifest?.name ?? "My App";
      const serverVersion =
        options.serverConfig?.version ?? config.manifest?.version ?? "1.0.0";

      let tools = options.serverConfig?.tools ?? [];
      if (tools.length === 0 && options.serverConfig?.mockConfig) {
        tools = extractToolsFromMockConfig(options.serverConfig.mockConfig);
      }

      // Read the generated HTML to embed in server
      const htmlPath = path.join(outputDir, "widget", "index.html");
      let widgetHtml: string | undefined;
      try {
        widgetHtml = await fs.readFile(htmlPath, "utf-8");
      } catch {
        warnings.push("Could not read widget HTML for server embedding");
      }

      const serverOutputDir = path.join(outputDir, "server");
      const serverResult = await generateMCPServer({
        config: {
          name: serverName,
          version: serverVersion,
          tools,
          widgetHtml,
        },
        outputDir: serverOutputDir,
      });

      if (serverResult.success) {
        for (const file of serverResult.files) {
          const fullPath = path.join(serverOutputDir, file.path);
          const stat = await fs.stat(fullPath);
          files.push({
            path: fullPath,
            relativePath: `server/${file.path}`,
            size: stat.size,
          });
        }
        console.log(`   Server files: ${serverResult.files.length}`);
      } else {
        errors.push(...serverResult.errors);
        warnings.push("MCP server generation had errors");
      }
    }

    return {
      success: true,
      outputDir,
      files,
      errors,
      warnings,
      manifest,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Export failed: ${message}`);
    return {
      success: false,
      outputDir,
      files,
      errors,
      warnings,
    };
  }
}

export function createDefaultExportConfig(
  widgetEntryPoint: string,
  name?: string,
): ExportConfig {
  return {
    widget: {
      entryPoint: widgetEntryPoint,
      name: name ?? "My MCP App",
    },
    output: {
      dir: "export",
      inline: false,
    },
    manifest: {
      name: name ?? "My MCP App",
      version: "1.0.0",
    },
  };
}
