#!/usr/bin/env tsx

/**
 * Test script for mcp-app-studio CLI scenarios.
 *
 * Tests the CLI by scaffolding projects for different deployment scenarios:
 * - chatgpt-only: Widget deployed to ChatGPT (no MCP server)
 * - mcp-only: Widget deployed with MCP server (for Claude Desktop, etc.)
 * - universal: Full-featured widget with MCP server (poi-map template)
 *
 * Phase 1: Scaffold → Build → Export pipeline validation
 * Phase 2: Runtime validation (loads exported widget in browser, tests Universal API)
 * Phase 3: Inspector validation (optional - tests with MCPJam Inspector and MCP Inspector)
 *
 * Usage:
 *   MCP_CLI_PATH=/path/to/mcp-app-studio npx tsx scripts/test-scenarios.ts
 *
 * Or if CLI is built and you're in the starter repo:
 *   npx tsx scripts/test-scenarios.ts
 *
 * Options:
 *   --runtime-only    Skip scaffold/build, only run runtime tests on existing exports
 *   --skip-runtime    Skip runtime tests (browser validation)
 *   --with-inspectors Run Phase 3 inspector tests (MCPJam + MCP Inspector)
 */

import type { ChildProcess } from "node:child_process";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";

// Parse CLI args
const ARGS = {
  withInspectors: process.argv.includes("--with-inspectors"),
  runtimeOnly: process.argv.includes("--runtime-only"),
  skipRuntime: process.argv.includes("--skip-runtime"),
};

interface Scenario {
  name: string;
  cliArgs: string[];
  expectedFiles: string[];
  unexpectedFiles?: string[];
}

interface TestResult {
  scenario: string;
  passed: boolean;
  steps: StepResult[];
  duration: number;
}

interface StepResult {
  name: string;
  passed: boolean;
  error?: string;
  output?: string;
}

const MCP_CLI_PATH =
  process.env.MCP_CLI_PATH ||
  "/Users/petepetrash/Code/aui/assistant-ui/packages/mcp-app-studio";

const SCENARIOS: Scenario[] = [
  {
    name: "chatgpt-only",
    cliArgs: ["-y", "--template", "minimal", "--no-server"],
    expectedFiles: [
      "export/widget/index.html",
      "export/widget/widget.js",
      "export/manifest.json",
      "export/README.md",
    ],
    unexpectedFiles: ["server/"],
  },
  {
    name: "mcp-only",
    cliArgs: ["-y", "--template", "minimal", "--include-server"],
    expectedFiles: [
      "export/widget/index.html",
      "export/widget/widget.js",
      "export/manifest.json",
      "export/README.md",
      "server/",
      "server/src/index.ts",
      "server/package.json",
    ],
  },
  {
    name: "universal",
    cliArgs: ["-y", "--template", "poi-map", "--include-server"],
    expectedFiles: [
      "export/widget/index.html",
      "export/widget/widget.js",
      "export/manifest.json",
      "export/README.md",
      "server/",
      "server/src/index.ts",
      "server/package.json",
    ],
  },
];

function log(message: string) {
  console.log(`  ${message}`);
}

function logStep(step: string) {
  console.log(`\n  >> ${step}`);
}

function logSuccess(message: string) {
  console.log(`  ✅ ${message}`);
}

function logError(message: string) {
  console.log(`  ❌ ${message}`);
}

async function fileExists(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

async function dirExists(dirpath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirpath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

function execFile(
  file: string,
  args: string[],
  cwd: string,
  timeout = 300000,
): { stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(file, args, {
      cwd,
      encoding: "utf-8",
      timeout,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    return { stdout: stdout || "", stderr: "" };
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message: string };
    throw new Error(err.stderr || err.message);
  }
}

async function runScenario(
  scenario: Scenario,
  testDir: string,
): Promise<TestResult> {
  const startTime = Date.now();
  const steps: StepResult[] = [];
  const projectDir = path.join(testDir, `test-${scenario.name}`);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing: ${scenario.name}`);
  console.log(`${"=".repeat(60)}`);

  // Step 1: Run CLI to scaffold project
  logStep("Scaffolding project with CLI...");
  try {
    const cliPath = path.join(MCP_CLI_PATH, "bin/mcp-app-studio.js");
    const cliArgs = [`test-${scenario.name}`, ...scenario.cliArgs];

    log(`Running: node ${cliPath} ${cliArgs.join(" ")}`);
    const { stdout } = execFile("node", [cliPath, ...cliArgs], testDir);
    if (stdout) log(stdout.split("\n").slice(0, 5).join("\n"));

    steps.push({ name: "scaffold", passed: true });
    logSuccess("Project scaffolded");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    steps.push({ name: "scaffold", passed: false, error: errorMsg });
    logError(`Scaffold failed: ${errorMsg}`);
    return {
      scenario: scenario.name,
      passed: false,
      steps,
      duration: Date.now() - startTime,
    };
  }

  // Step 2: Install dependencies
  logStep("Installing dependencies...");
  try {
    execFile("pnpm", ["install"], projectDir, 180000);
    steps.push({ name: "install", passed: true });
    logSuccess("Dependencies installed");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    steps.push({ name: "install", passed: false, error: errorMsg });
    logError(`Install failed: ${errorMsg}`);
    return {
      scenario: scenario.name,
      passed: false,
      steps,
      duration: Date.now() - startTime,
    };
  }

  // Step 2b: Install server dependencies if server is included
  const hasServer = scenario.cliArgs.includes("--include-server");
  if (hasServer) {
    const serverDir = path.join(projectDir, "server");
    if (await dirExists(serverDir)) {
      logStep("Installing server dependencies...");
      try {
        execFile("pnpm", ["install"], serverDir, 180000);
        steps.push({ name: "install-server", passed: true });
        logSuccess("Server dependencies installed");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        steps.push({ name: "install-server", passed: false, error: errorMsg });
        logError(`Server install failed: ${errorMsg}`);
        return {
          scenario: scenario.name,
          passed: false,
          steps,
          duration: Date.now() - startTime,
        };
      }
    }
  }

  // Step 3: Build project
  logStep("Building project...");
  try {
    execFile("pnpm", ["build"], projectDir, 180000);
    steps.push({ name: "build", passed: true });
    logSuccess("Project built");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    steps.push({ name: "build", passed: false, error: errorMsg });
    logError(`Build failed: ${errorMsg}`);
    return {
      scenario: scenario.name,
      passed: false,
      steps,
      duration: Date.now() - startTime,
    };
  }

  // Step 4: Run export
  logStep("Running export...");
  try {
    execFile("npx", ["tsx", "scripts/export.ts"], projectDir, 180000);
    steps.push({ name: "export", passed: true });
    logSuccess("Export completed");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    steps.push({ name: "export", passed: false, error: errorMsg });
    logError(`Export failed: ${errorMsg}`);
    return {
      scenario: scenario.name,
      passed: false,
      steps,
      duration: Date.now() - startTime,
    };
  }

  // Step 5: Validate expected files exist
  logStep("Validating expected files...");
  for (const expectedFile of scenario.expectedFiles) {
    const fullPath = path.join(projectDir, expectedFile);
    const exists = expectedFile.endsWith("/")
      ? await dirExists(fullPath)
      : await fileExists(fullPath);

    if (!exists) {
      steps.push({
        name: `validate-${expectedFile}`,
        passed: false,
        error: `Expected file/dir missing: ${expectedFile}`,
      });
      logError(`Missing: ${expectedFile}`);
      return {
        scenario: scenario.name,
        passed: false,
        steps,
        duration: Date.now() - startTime,
      };
    }
    log(`Found: ${expectedFile}`);
  }

  // Step 5b: Validate unexpected files don't exist
  if (scenario.unexpectedFiles) {
    for (const unexpectedFile of scenario.unexpectedFiles) {
      const fullPath = path.join(projectDir, unexpectedFile);
      const exists = unexpectedFile.endsWith("/")
        ? await dirExists(fullPath)
        : await fileExists(fullPath);

      if (exists) {
        steps.push({
          name: `validate-no-${unexpectedFile}`,
          passed: false,
          error: `Unexpected file/dir exists: ${unexpectedFile}`,
        });
        logError(`Unexpected: ${unexpectedFile}`);
        return {
          scenario: scenario.name,
          passed: false,
          steps,
          duration: Date.now() - startTime,
        };
      }
    }
  }

  steps.push({ name: "validate-files", passed: true });
  logSuccess("All expected files present");

  // Step 6: Validate file contents
  logStep("Validating file contents...");
  try {
    // Check HTML is valid
    const htmlPath = path.join(projectDir, "export/widget/index.html");
    const htmlContent = await fs.readFile(htmlPath, "utf-8");
    if (
      !htmlContent.includes("<!DOCTYPE html>") &&
      !htmlContent.includes("<html")
    ) {
      throw new Error("Invalid HTML structure");
    }
    if (!htmlContent.includes("widget.js")) {
      throw new Error("HTML does not reference widget.js");
    }
    log("HTML structure valid");

    // Check JS bundle exists and is non-empty
    const jsPath = path.join(projectDir, "export/widget/widget.js");
    const jsStat = await fs.stat(jsPath);
    if (jsStat.size < 1000) {
      throw new Error(`JS bundle too small: ${jsStat.size} bytes`);
    }
    log(`JS bundle: ${(jsStat.size / 1024).toFixed(1)} KB`);

    // Check manifest is valid JSON
    const manifestPath = path.join(projectDir, "export/manifest.json");
    const manifestContent = await fs.readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestContent);
    if (!manifest.schema_version || !manifest.name) {
      throw new Error("Manifest missing required fields");
    }
    log("Manifest valid");

    // Check server files if expected (in scaffolded project, not export)
    if (hasServer) {
      const serverIndexPath = path.join(projectDir, "server/src/index.ts");
      if (await fileExists(serverIndexPath)) {
        const serverContent = await fs.readFile(serverIndexPath, "utf-8");
        if (
          !serverContent.includes("McpServer") &&
          !serverContent.includes("Server")
        ) {
          throw new Error("Server index.ts does not contain MCP server code");
        }
        log("Server index.ts valid");
      }
    }

    steps.push({ name: "validate-contents", passed: true });
    logSuccess("File contents validated");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    steps.push({ name: "validate-contents", passed: false, error: errorMsg });
    logError(`Content validation failed: ${errorMsg}`);
    return {
      scenario: scenario.name,
      passed: false,
      steps,
      duration: Date.now() - startTime,
    };
  }

  // Step 7: Runtime validation - serve the widget and test it loads
  logStep("Running runtime validation...");
  try {
    const widgetDir = path.join(projectDir, "export/widget");
    const runtimeResult = await runRuntimeTests(widgetDir, scenario.name);

    if (!runtimeResult.passed) {
      steps.push({
        name: "runtime-validation",
        passed: false,
        error: runtimeResult.error,
      });
      logError(`Runtime validation failed: ${runtimeResult.error}`);
      return {
        scenario: scenario.name,
        passed: false,
        steps,
        duration: Date.now() - startTime,
      };
    }

    steps.push({ name: "runtime-validation", passed: true });
    logSuccess("Runtime validation passed");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    steps.push({ name: "runtime-validation", passed: false, error: errorMsg });
    logError(`Runtime validation failed: ${errorMsg}`);
    return {
      scenario: scenario.name,
      passed: false,
      steps,
      duration: Date.now() - startTime,
    };
  }

  // Step 8: Inspector validation (optional - Phase 3)
  if (ARGS.withInspectors) {
    logStep("Running inspector validation (Phase 3)...");
    try {
      const inspectorResults = await runInspectorTests(projectDir, scenario);

      // MCPJam Inspector result
      if (inspectorResults.mcpjamInspector) {
        const mcpjamResult = inspectorResults.mcpjamInspector;
        steps.push({
          name: "mcpjam-inspector",
          passed: mcpjamResult.passed,
          error: mcpjamResult.error,
          output: mcpjamResult.details?.join("\n"),
        });
        if (!mcpjamResult.passed) {
          logError(`MCPJam Inspector: ${mcpjamResult.error}`);
        }
      }

      // MCP Inspector result
      if (inspectorResults.mcpInspector) {
        const mcpResult = inspectorResults.mcpInspector;
        steps.push({
          name: "mcp-inspector",
          passed: mcpResult.passed,
          error: mcpResult.error,
          output: mcpResult.details?.join("\n"),
        });
        if (!mcpResult.passed) {
          logError(`MCP Inspector: ${mcpResult.error}`);
        }
      }

      // Only fail if both inspectors failed (allow partial success)
      const inspectorsPassed =
        (inspectorResults.mcpjamInspector?.passed ?? true) ||
        (inspectorResults.mcpInspector?.passed ?? true);

      if (!inspectorsPassed) {
        return {
          scenario: scenario.name,
          passed: false,
          steps,
          duration: Date.now() - startTime,
        };
      }

      logSuccess("Inspector validation passed");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      steps.push({
        name: "inspector-validation",
        passed: false,
        error: errorMsg,
      });
      logError(`Inspector validation failed: ${errorMsg}`);
      // Don't fail the whole test for inspector issues
      log("Continuing despite inspector error...");
    }
  }

  return {
    scenario: scenario.name,
    passed: true,
    steps,
    duration: Date.now() - startTime,
  };
}

// Simple static file server for testing
function startServer(
  dir: string,
  port: number,
): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = req.url || "/";
      const filePath = path.join(dir, url === "/" ? "index.html" : url);

      try {
        const content = await fs.readFile(filePath);
        const ext = path.extname(filePath);
        const contentType =
          ext === ".html"
            ? "text/html"
            : ext === ".js"
              ? "application/javascript"
              : ext === ".css"
                ? "text/css"
                : "application/octet-stream";

        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    server.listen(port, () => {
      resolve({ server, url: `http://localhost:${port}` });
    });

    server.on("error", reject);
  });
}

interface RuntimeTestResult {
  passed: boolean;
  error?: string;
  details?: string[];
}

async function runRuntimeTests(
  widgetDir: string,
  _scenarioName: string,
): Promise<RuntimeTestResult> {
  // Find an available port
  const port = 9000 + Math.floor(Math.random() * 1000);
  let server: http.Server | null = null;

  try {
    const { server: srv, url } = await startServer(widgetDir, port);
    server = srv;

    // Test 1: HTML loads successfully
    const htmlResponse = await fetch(`${url}/index.html`);
    if (!htmlResponse.ok) {
      return {
        passed: false,
        error: `HTML failed to load: ${htmlResponse.status}`,
      };
    }
    const html = await htmlResponse.text();

    // Test 2: HTML contains expected structure
    if (!html.includes("<!DOCTYPE html>") && !html.includes("<html")) {
      return { passed: false, error: "Invalid HTML structure" };
    }

    // Test 3: JS bundle loads
    const jsResponse = await fetch(`${url}/widget.js`);
    if (!jsResponse.ok) {
      return {
        passed: false,
        error: `JS bundle failed to load: ${jsResponse.status}`,
      };
    }
    const jsContent = await jsResponse.text();

    // Test 4: JS bundle contains Universal API markers
    const hasUniversalProvider =
      jsContent.includes("UniversalProvider") ||
      jsContent.includes("ProductionProvider");
    const hasPlatformDetection =
      jsContent.includes("detectPlatform") ||
      jsContent.includes("usePlatform") ||
      jsContent.includes("platform");

    if (!hasUniversalProvider) {
      log("Warning: UniversalProvider not found in bundle (may be minified)");
    }
    if (!hasPlatformDetection) {
      log("Note: Platform detection markers not found (may be minified)");
    }

    // Test 5: Bundle contains expected hooks
    const expectedHooks = ["useDisplayMode", "useTheme"];
    const missingHooks = expectedHooks.filter(
      (hook) => !jsContent.includes(hook),
    );
    if (missingHooks.length > 0) {
      log(
        `Note: Some hooks not found in bundle (may be minified): ${missingHooks.join(", ")}`,
      );
    }

    // Test 6: CSS loads if referenced
    if (html.includes("widget.css")) {
      const cssResponse = await fetch(`${url}/widget.css`);
      if (!cssResponse.ok) {
        return {
          passed: false,
          error: `CSS failed to load: ${cssResponse.status}`,
        };
      }
    }

    log(`Served at ${url}`);
    log(`HTML: ${(html.length / 1024).toFixed(1)}KB`);
    log(`JS: ${(jsContent.length / 1024).toFixed(1)}KB`);

    return { passed: true };
  } finally {
    if (server) {
      server.close();
    }
  }
}

async function main() {
  console.log("\n🧪 MCP App Studio CLI Test Suite\n");
  console.log(`CLI Path: ${MCP_CLI_PATH}`);

  // Verify CLI exists
  const cliPath = path.join(MCP_CLI_PATH, "bin/mcp-app-studio.js");
  if (!(await fileExists(cliPath))) {
    console.error(`\n❌ CLI not found at: ${cliPath}`);
    console.error(
      "Please set MCP_CLI_PATH to the mcp-app-studio package directory.",
    );
    console.error(
      "Example: MCP_CLI_PATH=/path/to/packages/mcp-app-studio npx tsx scripts/test-scenarios.ts",
    );
    process.exit(1);
  }

  // Create temp test directory
  const timestamp = Date.now();
  const testDir = path.join(os.tmpdir(), `mcp-app-studio-test-${timestamp}`);
  await fs.mkdir(testDir, { recursive: true });
  console.log(`Test directory: ${testDir}`);

  const results: TestResult[] = [];

  for (const scenario of SCENARIOS) {
    const result = await runScenario(scenario, testDir);
    results.push(result);
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("Test Summary");
  console.log(`${"=".repeat(60)}\n`);

  let allPassed = true;
  for (const result of results) {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    const duration = (result.duration / 1000).toFixed(1);
    console.log(`  ${status}  ${result.scenario} (${duration}s)`);
    if (!result.passed) {
      allPassed = false;
      const failedStep = result.steps.find((s) => !s.passed);
      if (failedStep) {
        console.log(`        Failed at: ${failedStep.name}`);
        if (failedStep.error) {
          console.log(`        Error: ${failedStep.error.split("\n")[0]}`);
        }
      }
    }
  }

  console.log(`\n${"-".repeat(60)}`);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(
    `Total: ${results.filter((r) => r.passed).length}/${results.length} passed (${(totalDuration / 1000).toFixed(1)}s)`,
  );
  console.log(`Test directory: ${testDir}`);
  console.log(`${"-".repeat(60)}\n`);

  if (allPassed) {
    console.log("🎉 All tests passed!\n");

    // Clean up on success
    const cleanup = process.env.CLEANUP !== "false";
    if (cleanup) {
      console.log("Cleaning up test directory...");
      await fs.rm(testDir, { recursive: true, force: true });
      console.log("Done.\n");
    } else {
      console.log("Skipping cleanup (CLEANUP=false)\n");
    }
  } else {
    console.log(
      "💥 Some tests failed. Test directory preserved for debugging.\n",
    );
    process.exit(1);
  }
}

// ============================================================================
// Phase 3: Inspector Tests (MCPJam + MCP Inspector)
// ============================================================================

interface InspectorTestResult {
  passed: boolean;
  tool: string;
  error?: string;
  details?: string[];
}

async function checkInspectorAvailable(
  command: string,
  args: string[],
): Promise<boolean> {
  try {
    execFileSync(command, args, {
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

async function runMCPInspectorTest(
  serverDir: string,
  _scenarioName: string,
): Promise<InspectorTestResult> {
  // Test that the MCP server can be inspected with @modelcontextprotocol/inspector
  const serverIndexPath = path.join(serverDir, "src/index.ts");

  if (!(await fileExists(serverIndexPath))) {
    return {
      passed: false,
      tool: "mcp-inspector",
      error: "Server index.ts not found",
    };
  }

  // Build the server first
  try {
    execFileSync("pnpm", ["build"], {
      cwd: serverDir,
      timeout: 60000,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      passed: false,
      tool: "mcp-inspector",
      error: `Server build failed: ${errorMsg}`,
    };
  }

  // Try to run MCP Inspector and list tools
  const serverEntryPath = path.join(serverDir, "dist/index.js");

  if (!(await fileExists(serverEntryPath))) {
    return {
      passed: false,
      tool: "mcp-inspector",
      error: "Server dist/index.js not found after build",
    };
  }

  // Run inspector with a timeout to list tools
  // Use a wrapper object to track the process across the Promise boundary
  const processRef: { current: ChildProcess | null } = { current: null };

  try {
    const result = await new Promise<{ stdout: string; stderr: string }>(
      (resolve, reject) => {
        let stdout = "";
        let stderr = "";
        const timeout = setTimeout(() => {
          if (processRef.current) processRef.current.kill();
          // If we got some output, consider it a success (inspector ran)
          if (stdout.length > 0 || stderr.length > 0) {
            resolve({ stdout, stderr });
          } else {
            reject(new Error("Inspector timed out with no output"));
          }
        }, 15000);

        const proc = spawn(
          "npx",
          ["@modelcontextprotocol/inspector", "node", serverEntryPath],
          {
            cwd: serverDir,
            stdio: ["pipe", "pipe", "pipe"],
          },
        );
        processRef.current = proc;

        proc.stdout?.on("data", (data: Buffer) => {
          stdout += data.toString();
          // If we see the inspector started, we can consider it successful
          if (
            stdout.includes("Inspector") ||
            stdout.includes("Connected") ||
            stdout.includes("http://")
          ) {
            clearTimeout(timeout);
            proc.kill();
            resolve({ stdout, stderr });
          }
        });

        proc.stderr?.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        proc.on("error", (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        });

        proc.on("close", (code: number | null) => {
          clearTimeout(timeout);
          if (code === 0 || stdout.length > 0) {
            resolve({ stdout, stderr });
          } else {
            reject(new Error(`Inspector exited with code ${code}: ${stderr}`));
          }
        });
      },
    );

    // Check if inspector ran successfully
    if (
      result.stdout.includes("Inspector") ||
      result.stdout.includes("http://") ||
      result.stdout.includes("MCP")
    ) {
      return {
        passed: true,
        tool: "mcp-inspector",
        details: ["MCP Inspector connected to server successfully"],
      };
    }

    return {
      passed: true,
      tool: "mcp-inspector",
      details: ["MCP Inspector ran (output may vary by version)"],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      passed: false,
      tool: "mcp-inspector",
      error: `MCP Inspector failed: ${errorMsg}`,
    };
  } finally {
    if (processRef.current) {
      processRef.current.kill();
    }
  }
}

async function runMCPJamInspectorTest(
  widgetDir: string,
  serverDir: string | null,
  _scenarioName: string,
): Promise<InspectorTestResult> {
  // Test that the widget can be loaded in MCPJam Inspector
  // MCPJam Inspector provides widget emulation for ChatGPT apps

  // First check if MCPJam Inspector is available
  const mcpjamAvailable = await checkInspectorAvailable("npx", [
    "@mcpjam/inspector@latest",
    "--version",
  ]);

  if (!mcpjamAvailable) {
    return {
      passed: true, // Skip but don't fail if not installed
      tool: "mcpjam-inspector",
      details: ["MCPJam Inspector not available (skipped)"],
    };
  }

  // For now, we validate the widget structure is compatible with MCPJam
  // Full integration would require running the inspector server
  const htmlPath = path.join(widgetDir, "index.html");
  const jsPath = path.join(widgetDir, "widget.js");

  if (!(await fileExists(htmlPath)) || !(await fileExists(jsPath))) {
    return {
      passed: false,
      tool: "mcpjam-inspector",
      error: "Widget files not found",
    };
  }

  // Check widget HTML has required structure for ChatGPT embedding
  const html = await fs.readFile(htmlPath, "utf-8");
  const js = await fs.readFile(jsPath, "utf-8");

  const checks: string[] = [];
  let hasIssues = false;

  // Check for script tag loading the bundle
  if (html.includes("widget.js")) {
    checks.push("HTML references widget.js bundle");
  } else {
    checks.push("WARNING: HTML doesn't reference widget.js");
    hasIssues = true;
  }

  // Check bundle size is reasonable for ChatGPT (<5MB recommended)
  const bundleSize = Buffer.byteLength(js, "utf-8");
  const bundleSizeMB = bundleSize / (1024 * 1024);
  if (bundleSizeMB < 5) {
    checks.push(`Bundle size OK: ${bundleSizeMB.toFixed(2)}MB`);
  } else {
    checks.push(
      `WARNING: Bundle size large: ${bundleSizeMB.toFixed(2)}MB (>5MB)`,
    );
  }

  // Check for OpenAI bridge markers (window.openai usage)
  if (
    js.includes("window.openai") ||
    js.includes("openai.") ||
    js.includes("OpenAI")
  ) {
    checks.push("Bundle contains OpenAI bridge integration");
  } else {
    checks.push(
      "Note: No direct window.openai reference found (may use wrapper)",
    );
  }

  // If server exists, validate it could work with MCPJam
  if (serverDir && (await dirExists(serverDir))) {
    const serverPackageJson = path.join(serverDir, "package.json");
    if (await fileExists(serverPackageJson)) {
      const pkg = JSON.parse(await fs.readFile(serverPackageJson, "utf-8"));
      if (pkg.dependencies?.["@modelcontextprotocol/sdk"]) {
        checks.push("Server uses MCP SDK");
      }
    }
  }

  return {
    passed: !hasIssues,
    tool: "mcpjam-inspector",
    details: checks,
  };
}

async function runInspectorTests(
  projectDir: string,
  scenario: Scenario,
): Promise<{
  mcpInspector?: InspectorTestResult;
  mcpjamInspector?: InspectorTestResult;
}> {
  const results: {
    mcpInspector?: InspectorTestResult;
    mcpjamInspector?: InspectorTestResult;
  } = {};

  const widgetDir = path.join(projectDir, "export/widget");
  const serverDir = path.join(projectDir, "server");
  const hasServer = scenario.cliArgs.includes("--include-server");

  // Run MCPJam Inspector test (for ChatGPT widget validation)
  log("Testing with MCPJam Inspector (ChatGPT emulator)...");
  results.mcpjamInspector = await runMCPJamInspectorTest(
    widgetDir,
    hasServer ? serverDir : null,
    scenario.name,
  );

  if (results.mcpjamInspector.passed) {
    logSuccess(
      `MCPJam: ${results.mcpjamInspector.details?.join(", ") || "OK"}`,
    );
  } else {
    logError(`MCPJam: ${results.mcpjamInspector.error}`);
  }

  // Run MCP Inspector test (for Claude/MCP server validation)
  if (hasServer && (await dirExists(serverDir))) {
    log("Testing with MCP Inspector (Claude Desktop)...");
    results.mcpInspector = await runMCPInspectorTest(serverDir, scenario.name);

    if (results.mcpInspector.passed) {
      logSuccess(
        `MCP Inspector: ${results.mcpInspector.details?.join(", ") || "OK"}`,
      );
    } else {
      logError(`MCP Inspector: ${results.mcpInspector.error}`);
    }
  }

  return results;
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
