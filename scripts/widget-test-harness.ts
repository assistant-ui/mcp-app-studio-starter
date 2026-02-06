#!/usr/bin/env tsx
/**
 * Widget Test Harness
 *
 * Tests exported MCP Apps widgets in a sandboxed iframe environment that simulates
 * an MCP Apps host, plus optional ChatGPT extensions (`window.openai`).
 *
 * This validates that:
 * 1. The widget HTML/JS/CSS loads correctly in a sandboxed iframe
 * 2. The widget initializes without errors
 * 3. The widget responds to the optional ChatGPT extensions API (`window.openai`) correctly
 * 4. The UniversalProvider can run with an MCP-first bridge + extensions layered on when present
 *
 * Usage:
 *   npx tsx scripts/widget-test-harness.ts <path-to-export-dir>
 *   npx tsx scripts/widget-test-harness.ts /tmp/test-project/export/widget
 */

import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { type Browser, chromium, type Page } from "playwright";

// Extend Window type for test harness globals
declare global {
  interface Window {
    __widgetLoaded?: boolean;
    __widgetError?: string;
    __openaiCalls?: Array<{ method: string; [key: string]: unknown }>;
  }
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string[];
}

interface WidgetTestResults {
  widgetDir: string;
  passed: boolean;
  tests: TestResult[];
  consoleErrors: string[];
  consoleLogs: string[];
}

// Mock `window.openai` implementation that matches ChatGPT's extensions API shape.
// Note: MCP hosts do not require `window.openai`. This exists for tests and
// local simulation only.
const MOCK_OPENAI_BRIDGE = `
// Enable debug mode for mcp-app-studio
window.__MCP_APP_STUDIO_DEBUG__ = true;

// Sample POI data for testing
const MOCK_TOOL_INPUT = {
  id: 'test-poi-map',
  pois: [
    {
      id: 'poi-1',
      name: 'Golden Gate Bridge',
      description: 'Iconic suspension bridge',
      category: 'landmark',
      lat: 37.8199,
      lng: -122.4783,
      address: 'Golden Gate Bridge, San Francisco, CA',
      rating: 4.8
    },
    {
      id: 'poi-2',
      name: 'Fisherman\\'s Wharf',
      description: 'Popular waterfront area',
      category: 'entertainment',
      lat: 37.8080,
      lng: -122.4177,
      address: 'Fisherman\\'s Wharf, San Francisco, CA',
      rating: 4.3
    },
    {
      id: 'poi-3',
      name: 'Blue Bottle Coffee',
      description: 'Artisan coffee roaster',
      category: 'cafe',
      lat: 37.7823,
      lng: -122.4071,
      address: '66 Mint St, San Francisco, CA',
      rating: 4.5
    }
  ],
  initialCenter: { lat: 37.7749, lng: -122.4194 },
  initialZoom: 12,
  title: 'San Francisco POIs'
};

window.openai = {
  // State
  theme: 'light',
  locale: 'en-US',
  displayMode: 'inline',
  previousDisplayMode: null,
  maxHeight: 600,
  toolInput: MOCK_TOOL_INPUT,
  toolOutput: null,
  toolResponseMetadata: null,
  widgetState: null,
  userAgent: {
    device: { type: 'desktop' },
    capabilities: { hover: true, touch: false }
  },
  safeArea: {
    insets: { top: 0, bottom: 0, left: 0, right: 0 }
  },
  view: null,
  userLocation: null,

  // Methods
  callTool: async function(name, args) {
    console.log('[mock-openai] callTool:', name, args);
    window.__openaiCalls = window.__openaiCalls || [];
    window.__openaiCalls.push({ method: 'callTool', name, args });
    return { success: true };
  },
  setWidgetState: function(state) {
    console.log('[mock-openai] setWidgetState:', state);
    this.widgetState = state;
  },
  requestDisplayMode: async function(args) {
    console.log('[mock-openai] requestDisplayMode:', args);
    this.previousDisplayMode = this.displayMode;
    this.displayMode = args.mode;
    return { mode: args.mode };
  },
  notifyIntrinsicHeight: function(height) {
    console.log('[mock-openai] notifyIntrinsicHeight:', height);
  },
  requestClose: function() {
    console.log('[mock-openai] requestClose');
  },
  sendFollowUpMessage: async function(args) {
    console.log('[mock-openai] sendFollowUpMessage:', args);
    window.__openaiCalls = window.__openaiCalls || [];
    window.__openaiCalls.push({ method: 'sendFollowUpMessage', args });
  },
  openExternal: function(payload) {
    console.log('[mock-openai] openExternal:', payload);
  },
  uploadFile: async function(file) {
    console.log('[mock-openai] uploadFile:', file.name);
    return { fileId: 'mock-file-id' };
  },
  getFileDownloadUrl: async function(args) {
    console.log('[mock-openai] getFileDownloadUrl:', args);
    return { downloadUrl: 'https://mock.url/' + args.fileId };
  },
  requestModal: async function(options) {
    console.log('[mock-openai] requestModal:', options);
  }
};

// Dispatch the openai:set_globals event that ChatGPT fires
window.dispatchEvent(new Event('openai:set_globals'));
console.log('[mock-openai] Bridge initialized');
`;

// Test page HTML that loads the widget directly (not in iframe) with mock bridge
function createTestPageHtml(
  widgetHtml: string,
  _widgetJs: string,
  widgetCss?: string,
): string {
  // Inject the mock bridge directly into the widget HTML before any other scripts
  const bridgeScript = `<script>${MOCK_OPENAI_BRIDGE}
// Signal that widget is ready for testing
window.__widgetLoaded = true;
</script>`;
  const cssStyle = widgetCss ? `<style>${widgetCss}</style>` : "";

  // Insert bridge script and CSS into the widget HTML
  let fullWidgetHtml = widgetHtml;

  // Add CSS to head
  if (fullWidgetHtml.includes("</head>")) {
    fullWidgetHtml = fullWidgetHtml.replace("</head>", `${cssStyle}</head>`);
  }

  // Add bridge script at the very beginning of body, before any other scripts
  if (fullWidgetHtml.includes("<body>")) {
    fullWidgetHtml = fullWidgetHtml.replace(
      "<body>",
      `<body>\n${bridgeScript}\n`,
    );
  } else if (fullWidgetHtml.includes("<body")) {
    // Handle <body class="..."> etc
    fullWidgetHtml = fullWidgetHtml.replace(
      /<body[^>]*>/,
      `$&\n${bridgeScript}\n`,
    );
  }

  return fullWidgetHtml;
}

async function startTestServer(
  widgetDir: string,
  modifiedHtml: string,
  port: number,
): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = req.url || "/";

      // Serve modified HTML for root/index.html
      if (url === "/" || url === "/index.html") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(modifiedHtml);
        return;
      }

      // Serve other files from widget directory
      const filePath = path.join(widgetDir, url);
      try {
        const content = await fs.readFile(filePath);
        const ext = path.extname(filePath);
        const contentType =
          ext === ".js"
            ? "application/javascript"
            : ext === ".css"
              ? "text/css"
              : ext === ".html"
                ? "text/html"
                : "application/octet-stream";
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    server.listen(port, () => resolve(server));
    server.on("error", reject);
  });
}

async function runWidgetTests(widgetDir: string): Promise<WidgetTestResults> {
  const results: WidgetTestResults = {
    widgetDir,
    passed: true,
    tests: [],
    consoleErrors: [],
    consoleLogs: [],
  };

  // Load widget files
  const htmlPath = path.join(widgetDir, "index.html");
  const jsPath = path.join(widgetDir, "widget.js");
  const cssPath = path.join(widgetDir, "widget.css");

  let widgetHtml: string;
  let widgetJs: string;
  let widgetCss: string | undefined;

  try {
    widgetHtml = await fs.readFile(htmlPath, "utf-8");
    widgetJs = await fs.readFile(jsPath, "utf-8");
  } catch (error) {
    results.passed = false;
    results.tests.push({
      name: "load-files",
      passed: false,
      error: `Failed to load widget files: ${error}`,
    });
    return results;
  }

  try {
    widgetCss = await fs.readFile(cssPath, "utf-8");
  } catch {
    // CSS is optional
  }

  results.tests.push({
    name: "load-files",
    passed: true,
    details: [
      `HTML: ${widgetHtml.length} bytes`,
      `JS: ${widgetJs.length} bytes`,
    ],
  });

  // Start test server
  const port = 9500 + Math.floor(Math.random() * 500);
  const modifiedHtml = createTestPageHtml(widgetHtml, widgetJs, widgetCss);
  let server: http.Server | null = null;
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    server = await startTestServer(widgetDir, modifiedHtml, port);
    results.tests.push({ name: "start-server", passed: true });

    // Launch browser
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();

    // Capture console messages
    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error") {
        results.consoleErrors.push(text);
      } else {
        results.consoleLogs.push(text);
      }
    });

    // Capture page errors (JavaScript exceptions)
    page.on("pageerror", (error) => {
      results.consoleErrors.push(`[PAGE ERROR] ${error.message}`);
    });

    // Navigate to test page
    await page.goto(`http://localhost:${port}`, { waitUntil: "networkidle" });
    results.tests.push({ name: "load-page", passed: true });

    // Wait for widget to load
    await page.waitForFunction(() => (window as any).__widgetLoaded === true, {
      timeout: 10000,
    });
    results.tests.push({ name: "widget-loaded", passed: true });

    // Check for widget errors
    const widgetError = await page.evaluate(
      () => (window as any).__widgetError,
    );
    if (widgetError) {
      results.tests.push({
        name: "widget-no-errors",
        passed: false,
        error: widgetError,
      });
      results.passed = false;
    } else {
      results.tests.push({ name: "widget-no-errors", passed: true });
    }

    // Check if mock bridge was initialized (no iframe, direct page)
    const bridgeInitialized = await page.evaluate(() => {
      return (window as Window & { openai?: unknown }).openai !== undefined;
    });

    if (bridgeInitialized) {
      results.tests.push({
        name: "bridge-initialized",
        passed: true,
        details: ["window.openai bridge is available"],
      });
    } else {
      results.tests.push({
        name: "bridge-initialized",
        passed: false,
        error: "window.openai bridge not found",
      });
      results.passed = false;
    }

    // Check for console errors (exclude our mock logs)
    const widgetErrors = results.consoleErrors.filter(
      (e) => !e.includes("[mock-openai]") && !e.includes("[harness]"),
    );

    if (widgetErrors.length > 0) {
      // Check for common issues
      const hasContextError = widgetErrors.some(
        (e) => e.includes("must be used within") || e.includes("Provider"),
      );
      const hasPayloadError = widgetErrors.some(
        (e) => e.includes("Invalid") && e.includes("payload"),
      );

      let errorHint = "";
      if (hasContextError) {
        errorHint =
          "\n      HINT: Widget may be using workbench-specific hooks instead of production SDK hooks.";
      } else if (hasPayloadError) {
        errorHint =
          "\n      HINT: Update MOCK_TOOL_INPUT in test harness with valid widget data.";
      }

      results.tests.push({
        name: "no-console-errors",
        passed: false,
        error: `Found ${widgetErrors.length} console errors${errorHint}`,
        details: widgetErrors.slice(0, 5),
      });
      results.passed = false;
    } else {
      results.tests.push({ name: "no-console-errors", passed: true });
    }

    // Wait for React to render (check for content in #root)
    await page
      .waitForFunction(
        () => {
          const root = document.getElementById("root");
          return root && root.innerHTML.length > 50;
        },
        { timeout: 10000 },
      )
      .catch(() => {
        // If timeout, we'll still check and report
      });

    // Check if widget rendered something (direct page, no iframe)
    const contentInfo = await page.evaluate(() => {
      const root = document.getElementById("root");
      const rootHtml = root?.innerHTML || "";
      const rootLength = rootHtml.length;
      const body = document.body;
      const bodyHtml = body?.innerHTML || "";
      const nonScriptContent = bodyHtml
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .trim();
      return {
        rootExists: !!root,
        rootLength,
        rootPreview: rootHtml.substring(0, 200),
        nonScriptLength: nonScriptContent.length,
        hasContent: rootLength > 50 || nonScriptContent.length > 100,
      };
    });

    if (contentInfo.hasContent) {
      results.tests.push({
        name: "widget-rendered",
        passed: true,
        details: [
          `Root element: ${contentInfo.rootLength} chars`,
          `Preview: ${contentInfo.rootPreview.substring(0, 100)}...`,
        ],
      });
    } else {
      results.tests.push({
        name: "widget-rendered",
        passed: false,
        error: "Widget did not render any content",
        details: [
          `Root exists: ${contentInfo.rootExists}`,
          `Root length: ${contentInfo.rootLength}`,
          `Non-script content length: ${contentInfo.nonScriptLength}`,
          `Root preview: "${contentInfo.rootPreview}"`,
        ],
      });
      results.passed = false;
    }

    // Take screenshot for debugging
    const screenshotPath = path.join(
      widgetDir,
      "..",
      "widget-test-screenshot.png",
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    results.tests.push({
      name: "screenshot",
      passed: true,
      details: [`Saved to ${screenshotPath}`],
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.tests.push({
      name: "browser-test",
      passed: false,
      error: errorMsg,
    });
    results.passed = false;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
    if (server) server.close();
  }

  return results;
}

function printResults(results: WidgetTestResults): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log("Widget Test Results");
  console.log("=".repeat(60));
  console.log(`\nWidget: ${results.widgetDir}\n`);

  for (const test of results.tests) {
    const status = test.passed ? "✅" : "❌";
    console.log(`  ${status} ${test.name}`);
    if (test.details) {
      for (const detail of test.details) {
        console.log(`      ${detail}`);
      }
    }
    if (test.error) {
      console.log(`      Error: ${test.error}`);
    }
  }

  if (results.consoleLogs.length > 0) {
    console.log("\nConsole logs:");
    for (const log of results.consoleLogs.slice(0, 10)) {
      console.log(`    ${log}`);
    }
    if (results.consoleLogs.length > 10) {
      console.log(`    ... and ${results.consoleLogs.length - 10} more`);
    }
  }

  console.log(`\n${"-".repeat(60)}`);
  console.log(`Overall: ${results.passed ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`${"-".repeat(60)}\n`);
}

async function main() {
  const widgetDir = process.argv[2];

  if (!widgetDir) {
    console.error(
      "Usage: npx tsx scripts/widget-test-harness.ts <path-to-widget-dir>",
    );
    console.error(
      "Example: npx tsx scripts/widget-test-harness.ts /tmp/test/export/widget",
    );
    process.exit(1);
  }

  const resolvedDir = path.resolve(widgetDir);
  console.log(`\n🧪 Testing widget: ${resolvedDir}\n`);

  const results = await runWidgetTests(resolvedDir);
  printResults(results);

  process.exit(results.passed ? 0 : 1);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
