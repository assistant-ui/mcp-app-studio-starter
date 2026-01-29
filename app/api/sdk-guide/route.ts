import { createMCPClient } from "@ai-sdk/mcp";
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { z } from "zod";
import { checkRateLimit } from "@/lib/integrations/rate-limit/upstash";

export const runtime = "edge";

const MCP_APPS_DOCS_URL = "https://modelcontextprotocol.github.io/ext-apps/api/";
const OPENAI_DOCS_MCP_URL = "https://developers.openai.com/mcp";

interface WorkbenchContext {
  selectedComponent: string;
  displayMode: string;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  widgetState: Record<string, unknown> | null;
  recentConsoleLogs: Array<{
    type: string;
    method: string;
    args?: unknown;
    result?: unknown;
    timestamp: string;
  }>;
}

function buildSystemPrompt(context: WorkbenchContext): string {
  return `You are MCP App Assistant, an assistant that helps developers build MCP Apps that work across multiple platforms including ChatGPT and Claude Desktop.

## Your Role
- Answer questions about the MCP Apps SDK and protocol
- Help debug configuration issues
- Explain MCP concepts with practical examples
- Use the available tools to search and fetch documentation when needed

## Scope
Focus on helping with MCP Apps development. This includes:
- The MCP Apps SDK (ext-apps) for building interactive UI components
- ChatGPT Apps SDK compatibility
- Tool definitions, widget state, display modes
- Cross-platform compatibility between MCP hosts

## Current Workbench Context
The user is working in an MCP App workbench with the following state:
- Component: ${context.selectedComponent || "none loaded"}
- Display mode: ${context.displayMode}
- Has tool input: ${!!context.toolInput && Object.keys(context.toolInput).length > 0}
- Has tool output: ${!!context.toolOutput}
- Has widget state: ${!!context.widgetState}

## Available Tools
You have tools to:
1. \`fetch_mcp_apps_docs\` - Fetch the MCP Apps SDK documentation
2. \`search_openai_docs\` - Search the OpenAI/ChatGPT Apps documentation
3. \`fetch_openai_doc\` - Fetch a specific OpenAI documentation page
4. \`inspect_workbench\` - Get the user's current configuration (tool input, output, widget state)
5. \`get_console_logs\` - See recent SDK method calls
6. \`validate_config\` - Check for common configuration issues

Use the documentation tools proactively to find accurate, up-to-date information. Always search or fetch docs before answering technical questions.

## Guidelines
1. Be direct and practical—developers value their time
2. When referencing docs, mention the source URL so users can read more
3. Use the inspect tools to ground your answers in the user's actual configuration
4. For configuration issues, explain both what's wrong AND how to fix it
5. Keep responses concise but complete
6. Prefer searching docs over relying on general knowledge
7. When discussing platform differences, clarify which platform(s) support each feature`;
}

let mcpClientPromise: Promise<
  Awaited<ReturnType<typeof createMCPClient>>
> | null = null;

async function getMCPClient() {
  if (!mcpClientPromise) {
    mcpClientPromise = createMCPClient({
      transport: {
        type: "sse",
        url: OPENAI_DOCS_MCP_URL,
      },
    });
  }
  return mcpClientPromise;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "anonymous";

    const rateLimitResult = await checkRateLimit(ip);

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please try again later.",
          reset: rateLimitResult.reset,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        },
      );
    }

    const { messages, workbenchContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: messages array required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const context: WorkbenchContext = workbenchContext || {
      selectedComponent: "unknown",
      displayMode: "inline",
      toolInput: {},
      toolOutput: null,
      widgetState: null,
      recentConsoleLogs: [],
    };

    const modelMessages = await convertToModelMessages(messages);

    let mcpTools: Record<string, unknown> = {};
    try {
      const mcpClient = await getMCPClient();
      mcpTools = await mcpClient.tools();
    } catch (error) {
      console.warn("Failed to connect to OpenAI Docs MCP server:", error);
    }

    const workbenchTools = {
      fetch_mcp_apps_docs: {
        description:
          "Fetch the official MCP Apps SDK documentation. Use this to answer questions about the MCP ext-apps protocol, widget lifecycle, display modes, tool integration, and cross-platform compatibility.",
        inputSchema: z.object({
          section: z
            .string()
            .optional()
            .describe(
              "Optional section to focus on (e.g., 'widget', 'tools', 'lifecycle')",
            ),
        }),
        execute: async ({ section }: { section?: string }) => {
          try {
            const response = await fetch(MCP_APPS_DOCS_URL);
            if (!response.ok) {
              return {
                error: `Failed to fetch MCP Apps docs: ${response.status}`,
              };
            }
            const html = await response.text();
            // Extract text content from HTML (basic extraction)
            const textContent = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            return {
              url: MCP_APPS_DOCS_URL,
              content: textContent.slice(0, 15000), // Limit content size
              section: section || "full",
            };
          } catch (error) {
            return {
              error: `Error fetching MCP Apps docs: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
          }
        },
      },

      inspect_workbench: {
        description:
          "Get the current workbench configuration including the selected component, tool input/output, and widget state. Use this to understand what the user is working on.",
        inputSchema: z.object({
          include: z
            .array(
              z.enum([
                "component",
                "toolInput",
                "toolOutput",
                "widgetState",
                "displayMode",
              ]),
            )
            .optional()
            .describe(
              "Which parts of the configuration to include. Defaults to all.",
            ),
        }),
        execute: async ({ include }: { include?: string[] }) => {
          const includeSet = new Set(
            include || [
              "component",
              "toolInput",
              "toolOutput",
              "widgetState",
              "displayMode",
            ],
          );

          const config: Record<string, unknown> = {};

          if (includeSet.has("component")) {
            config.component = context.selectedComponent;
          }
          if (includeSet.has("displayMode")) {
            config.displayMode = context.displayMode;
          }
          if (includeSet.has("toolInput")) {
            config.toolInput = context.toolInput;
          }
          if (includeSet.has("toolOutput")) {
            config.toolOutput = context.toolOutput;
          }
          if (includeSet.has("widgetState")) {
            config.widgetState = context.widgetState;
          }

          return config;
        },
      },

      get_console_logs: {
        description:
          "Retrieve recent SDK method calls from the console. Useful for debugging and understanding what interactions have occurred.",
        inputSchema: z.object({
          limit: z
            .number()
            .optional()
            .default(10)
            .describe("Maximum number of log entries to return"),
          method: z
            .string()
            .optional()
            .describe(
              "Filter by method name (e.g., 'callTool', 'setWidgetState')",
            ),
        }),
        execute: async ({
          limit,
          method,
        }: {
          limit?: number;
          method?: string;
        }) => {
          let logs = context.recentConsoleLogs || [];

          if (method) {
            logs = logs.filter((log) => log.method === method);
          }

          return {
            logs: logs.slice(0, limit ?? 10),
            totalCount: context.recentConsoleLogs?.length || 0,
          };
        },
      },

      validate_config: {
        description:
          "Check the current tool configuration for common issues and provide recommendations. Use this to help users debug configuration problems.",
        inputSchema: z.object({
          configType: z
            .enum(["tool_descriptor", "tool_result", "widget_state"])
            .describe("The type of configuration to validate"),
        }),
        execute: async ({ configType }: { configType: string }) => {
          const issues: Array<{
            severity: "error" | "warning" | "info";
            field: string;
            message: string;
            suggestion?: string;
          }> = [];

          const input = context.toolInput || {};

          if (configType === "tool_descriptor") {
            const meta = (input._meta || {}) as Record<string, unknown>;

            if (!meta["openai/outputTemplate"]) {
              issues.push({
                severity: "error",
                field: '_meta["openai/outputTemplate"]',
                message:
                  "Missing output template URI. Your component won't render without this.",
                suggestion:
                  'Add a _meta["openai/outputTemplate"] field pointing to your component HTML resource URI.',
              });
            }

            if (
              meta["openai/visibility"] === "private" &&
              !meta["openai/widgetAccessible"]
            ) {
              issues.push({
                severity: "warning",
                field: '_meta["openai/widgetAccessible"]',
                message:
                  "Tool is private but not widget-accessible. Your component won't be able to call this tool.",
                suggestion:
                  'Set _meta["openai/widgetAccessible"]: true if the component needs to call this tool.',
              });
            }

            const invokingText = meta["openai/toolInvocation/invoking"];
            if (typeof invokingText === "string" && invokingText.length > 64) {
              issues.push({
                severity: "warning",
                field: '_meta["openai/toolInvocation/invoking"]',
                message: `Status text is ${invokingText.length} characters. Maximum is 64.`,
                suggestion:
                  "Shorten the invoking status text to 64 characters or less.",
              });
            }
          }

          if (configType === "tool_result") {
            const output = context.toolOutput || {};

            if (!output.structuredContent && !output.content) {
              issues.push({
                severity: "warning",
                field: "structuredContent / content",
                message:
                  "Tool result has neither structuredContent nor content. The model won't receive any data.",
                suggestion:
                  "Add structuredContent for data the model should see, or content for transcript text.",
              });
            }
          }

          if (configType === "widget_state") {
            const state = context.widgetState;

            if (state && JSON.stringify(state).length > 16000) {
              issues.push({
                severity: "warning",
                field: "widgetState",
                message:
                  "Widget state is very large. This may impact performance.",
                suggestion:
                  "Keep widget state under 4k tokens for optimal performance.",
              });
            }
          }

          return {
            valid: issues.filter((i) => i.severity === "error").length === 0,
            issueCount: issues.length,
            issues,
          };
        },
      },
    };

    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages: modelMessages,
      system: buildSystemPrompt(context),
      tools: {
        ...mcpTools,
        ...workbenchTools,
      },
      stopWhen: stepCountIs(5),
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in SDK Guide API route:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred while processing your request.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
