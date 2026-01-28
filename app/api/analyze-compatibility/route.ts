import fs from "node:fs/promises";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface HookInfo {
  name: string;
  platform: "universal" | "chatgpt-only" | "mcp-only";
  description: string;
}

// All hooks exported by mcp-app-studio are universal - the SDK provides
// implementations for both ChatGPT and MCP platforms. Some hooks have better
// native support on one platform, but the SDK ensures they work everywhere.
const HOOK_REGISTRY: Record<string, HookInfo> = {
  useToolInput: {
    name: "useToolInput",
    platform: "universal",
    description: "Get tool call input data",
  },
  useTheme: {
    name: "useTheme",
    platform: "universal",
    description: "Get current theme",
  },
  useCallTool: {
    name: "useCallTool",
    platform: "universal",
    description: "Call backend tools",
  },
  useDisplayMode: {
    name: "useDisplayMode",
    platform: "universal",
    description: "Get/set display mode",
  },
  useSendMessage: {
    name: "useSendMessage",
    platform: "universal",
    description: "Send messages to conversation",
  },
  useCapabilities: {
    name: "useCapabilities",
    platform: "universal",
    description: "Check platform capabilities",
  },
  usePlatform: {
    name: "usePlatform",
    platform: "universal",
    description: "Get current platform",
  },
  useFeature: {
    name: "useFeature",
    platform: "universal",
    description: "Check specific feature availability",
  },
  useOpenLink: {
    name: "useOpenLink",
    platform: "universal",
    description: "Open external links",
  },
  useHostContext: {
    name: "useHostContext",
    platform: "universal",
    description: "Get host context information",
  },
  useWidgetState: {
    name: "useWidgetState",
    platform: "universal",
    description: "Persistent widget state",
  },
  useToolInputPartial: {
    name: "useToolInputPartial",
    platform: "universal",
    description: "Streaming tool input",
  },
  useUpdateModelContext: {
    name: "useUpdateModelContext",
    platform: "universal",
    description: "Update model context",
  },
  useLog: {
    name: "useLog",
    platform: "universal",
    description: "Structured logging",
  },
  useToolResult: {
    name: "useToolResult",
    platform: "universal",
    description: "Get/set tool result",
  },
};

export interface CompatibilityResult {
  chatgptCompatible: boolean;
  mcpCompatible: boolean;
  hooksUsed: Array<{
    name: string;
    platform: "universal" | "chatgpt-only" | "mcp-only";
  }>;
  warnings: string[];
}

function extractImportedHooks(content: string): Set<string> {
  const hookNames = Object.keys(HOOK_REGISTRY);
  const importedHooks = new Set<string>();

  // Match import statements and extract named imports
  // Handles: import { useX, useY } from '...'
  // Handles: import { useX as alias, useY } from '...'
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*["'][^"']+["']/g;

  for (const match of content.matchAll(importRegex)) {
    const importBlock = match[1];
    // Split by comma and extract the original name (before 'as' if present)
    const names = importBlock.split(",").map((s) => {
      const trimmed = s.trim();
      // Handle 'useX as alias' - we want 'useX'
      const asMatch = trimmed.match(/^(\w+)\s+as\s+/);
      return asMatch ? asMatch[1] : trimmed;
    });

    for (const name of names) {
      if (hookNames.includes(name)) {
        importedHooks.add(name);
      }
    }
  }

  return importedHooks;
}

function detectHookCalls(content: string, importedHooks: Set<string>): Set<string> {
  const usedHooks = new Set<string>();

  for (const hook of importedHooks) {
    // Look for actual function calls: hookName() or hookName<Type>()
    // This ensures we're finding usage, not just imports
    const callPattern = new RegExp(`\\b${hook}\\s*(?:<[^>]*>)?\\s*\\(`, "g");
    if (callPattern.test(content)) {
      usedHooks.add(hook);
    }
  }

  return usedHooks;
}

export async function POST(req: NextRequest) {
  try {
    const { entryPoint } = await req.json();

    if (!entryPoint || typeof entryPoint !== "string") {
      return NextResponse.json(
        { error: "Missing entryPoint parameter" },
        { status: 400 },
      );
    }

    const projectRoot = process.cwd();
    const widgetPath = path.resolve(projectRoot, entryPoint);

    let content: string;
    try {
      content = await fs.readFile(widgetPath, "utf-8");
    } catch {
      return NextResponse.json(
        { error: `Widget entry point not found: ${entryPoint}` },
        { status: 404 },
      );
    }

    // Step 1: Find which hooks are imported in the widget file
    const importedHooks = extractImportedHooks(content);

    // Step 2: Find which of those imported hooks are actually called
    const usedHooks = detectHookCalls(content, importedHooks);

    const hookInfos = Array.from(usedHooks).map((name) => ({
      name,
      platform: HOOK_REGISTRY[name]?.platform ?? ("universal" as const),
    }));

    const hasChatGPTOnly = hookInfos.some((h) => h.platform === "chatgpt-only");
    const hasMCPOnly = hookInfos.some((h) => h.platform === "mcp-only");

    const warnings: string[] = [];

    if (hasChatGPTOnly && hasMCPOnly) {
      warnings.push(
        "Widget uses both ChatGPT-only and MCP-only hooks. Consider using feature detection.",
      );
    }

    const result: CompatibilityResult = {
      chatgptCompatible: !hasMCPOnly,
      mcpCompatible: !hasChatGPTOnly,
      hooksUsed: hookInfos,
      warnings,
    };

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 },
    );
  }
}
