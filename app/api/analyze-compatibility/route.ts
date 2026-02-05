import fs from "node:fs/promises";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface HookInfo {
  name: string;
  category: "portable" | "chatgpt-extensions";
  description: string;
}

// All hooks exported by mcp-app-studio are portable across MCP Apps hosts.
// Some capabilities depend on the host, and a small set are optional
// ChatGPT-only extensions (via `window.openai`).
const HOOK_REGISTRY: Record<string, HookInfo> = {
  useToolInput: {
    name: "useToolInput",
    category: "portable",
    description: "Get tool call input data",
  },
  useTheme: {
    name: "useTheme",
    category: "portable",
    description: "Get current theme",
  },
  useCallTool: {
    name: "useCallTool",
    category: "portable",
    description: "Call backend tools",
  },
  useDisplayMode: {
    name: "useDisplayMode",
    category: "portable",
    description: "Get/set display mode",
  },
  useSendMessage: {
    name: "useSendMessage",
    category: "portable",
    description: "Send messages to conversation",
  },
  useCapabilities: {
    name: "useCapabilities",
    category: "portable",
    description: "Check platform capabilities",
  },
  usePlatform: {
    name: "usePlatform",
    category: "portable",
    description: "Get current platform",
  },
  useFeature: {
    name: "useFeature",
    category: "portable",
    description: "Check specific feature availability",
  },
  useOpenLink: {
    name: "useOpenLink",
    category: "portable",
    description: "Open external links",
  },
  useHostContext: {
    name: "useHostContext",
    category: "portable",
    description: "Get host context information",
  },
  useWidgetState: {
    name: "useWidgetState",
    category: "chatgpt-extensions",
    description: "Persistent widget state",
  },
  useToolInputPartial: {
    name: "useToolInputPartial",
    category: "portable",
    description: "Streaming tool input",
  },
  useUpdateModelContext: {
    name: "useUpdateModelContext",
    category: "portable",
    description: "Update model context",
  },
  useLog: {
    name: "useLog",
    category: "portable",
    description: "Structured logging",
  },
  useToolResult: {
    name: "useToolResult",
    category: "portable",
    description: "Get/set tool result",
  },
};

export interface CompatibilityResult {
  usesChatGPTExtensions: boolean;
  hooksUsed: Array<{
    name: string;
    category: "portable" | "chatgpt-extensions";
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

function detectHookCalls(
  content: string,
  importedHooks: Set<string>,
): Set<string> {
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
      category: HOOK_REGISTRY[name]?.category ?? ("portable" as const),
    }));

    const usesChatGPTExtensions = hookInfos.some(
      (h) => h.category === "chatgpt-extensions",
    );

    const warnings: string[] = [];

    if (usesChatGPTExtensions) {
      warnings.push(
        "Widget uses ChatGPT-only extensions (window.openai). Feature-detect with useFeature(...) and provide fallbacks for other MCP hosts.",
      );
    }

    const result: CompatibilityResult = {
      usesChatGPTExtensions,
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
