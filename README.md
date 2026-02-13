# MCP App Studio Starter

Starter template for building interactive apps for AI assistants with [MCP App Studio](https://github.com/assistant-ui/assistant-ui/tree/main/packages/mcp-app-studio).

> **Note:** This template is automatically downloaded when you run `npx mcp-app-studio`. You don't need to clone this repo directly.

## Supported Platforms

Build once, deploy anywhere:

- **ChatGPT** — as an MCP Apps host (standard `ui/*` bridge)
- **Claude Desktop** — as an MCP Apps host
- **Any MCP Apps host** — compatible with any MCP-supporting AI assistant

## Quick Start

```bash
# npm (default)
npm install
npm run dev
```

Open http://localhost:3002 — you're in the workbench.

This project also works with pnpm/yarn/bun (use the equivalent install + run commands).

If you switch package managers (e.g. `pnpm` → `npm`), delete `node_modules/` first to avoid confusing the installer.

The MCP server (when `server/` exists) runs at `http://localhost:3001/mcp` by default. If 3001 is already in use, it will select the next available port and write it to `server/.mcp-port`.

The workbench simulates an MCP Apps host in an iframe. It also installs a
`window.openai` shim so you can exercise **ChatGPT-only extensions** during
development (optional, non-standard).

## Agent Workflow

Use `.agent/skills/mcp-app-development/SKILL.md` as the default coding-agent workflow for this repo. It defines the 80/20 capability-slice loop:

- Build UI and real MCP tool(s) in one chunk
- Use TDD (`red -> green`) for parity checks
- Never treat mock-only behavior as done

## Commands

| Command          | Description                              |
| ---------------- | ---------------------------------------- |
| `npm run dev`    | Start workbench (Next.js + MCP server)   |
| `npm run build`  | Production build                         |
| `npm run export` | Generate widget bundle for deployment    |

## Project Structure

```
app/                        Next.js pages
components/
├── examples/               Example widgets (POI Map)
├── workbench/              Workbench UI components
└── ui/                     Shared UI components
lib/
├── sdk/                    SDK exports for production
├── workbench/              React hooks + dev environment
└── export/                 Production bundler
server/                     MCP server (if included)
```

## Building Your Widget

### 1. Create a component

```tsx
// components/my-widget/index.tsx
import {
  useToolInput,
  useCallTool,
  useTheme,
  useCapabilities,
  useUpdateModelContext,
  useWidgetState,
} from "@/lib/sdk";

export function MyWidget() {
  const input = useToolInput<{ query: string }>();
  const callTool = useCallTool();
  const theme = useTheme();
  const capabilities = useCapabilities();
  const updateModelContext = useUpdateModelContext();
  const [widgetState, setWidgetState] = useWidgetState();

  const handleSearch = async () => {
    const result = await callTool("search", { query: input.query });
    console.log(result.structuredContent);
  };

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <p>Query: {input.query}</p>
      <button onClick={handleSearch}>Search</button>

      {/* Platform-specific features */}
      {capabilities.modelContext && (
        <button
          onClick={() =>
            updateModelContext({ structuredContent: { query: input.query } })
          }
        >
          Update model context (host-dependent)
        </button>
      )}
      {capabilities.widgetState && (
        <button
          onClick={() =>
            setWidgetState({
              ...(widgetState ?? {}),
              savedAt: Date.now(),
            })
          }
        >
          Save widget state (ChatGPT extensions)
        </button>
      )}
    </div>
  );
}
```

### 2. Register in the workbench

Add your component to `lib/workbench/component-registry.tsx`.

### 3. Add mock data

Configure mock tool responses in `lib/workbench/mock-config/`.

### React Hooks Reference

Full documentation: [`lib/workbench/README.md`](lib/workbench/README.md)

#### Universal Hooks (recommended)

These hooks work identically across MCP hosts (including ChatGPT):

| Hook | Description |
| ---- | ----------- |
| `useToolInput<T>()` | Get input arguments from tool call |
| `useTheme()` | Get current theme ("light" or "dark") |
| `useCallTool()` | Call backend tools |
| `useDisplayMode()` | Get/set display mode |
| `useSendMessage()` | Send messages to conversation |

#### Platform Detection (when needed)

| Hook | Description |
| ---- | ----------- |
| `useCapabilities()` | Get full capability object |
| `useFeature(name)` | Check if specific feature is available |

#### Host-Dependent / Extensions (advanced)

These hooks only work on specific platforms. Check availability first:

| Hook | Platform | Description |
| ---- | -------- | ----------- |
| `useWidgetState()` | ChatGPT extensions | Persistent state across sessions |
| `useUpdateModelContext()` | Host-dependent | Update model-visible context dynamically |
| `useToolInputPartial()` | Host-dependent | Streaming input during generation |
| `useLog()` | Host-dependent | Structured logging to host |
| `openModal()` helper | ChatGPT extensions (fallback-safe) | Use host modal when available, fallback locally |

## Platform-Specific Features

MCP App Studio is MCP-first: prefer the MCP Apps bridge (`ui/*`) and feature-detect
optional ChatGPT extensions (`window.openai`) when needed.

| Feature | MCP Apps standard | ChatGPT extensions (optional) |
| ------- | ----------------- | ---------------------------- |
| Tool input | Yes | (alias: `window.openai.toolInput`) |
| Tool result | Yes | (alias: `window.openai.toolOutput`) |
| Call tool | Yes | (alias: `window.openai.callTool`) |
| Send message | Host-dependent | (alias: `window.openai.sendFollowUpMessage`) |
| Update model context | Host-dependent | (extension: `window.openai.setWidgetState`) |
| Host-managed modal | No | Yes (`window.openai.requestModal`) |
| Widget state persistence | No | Yes |
| File upload/download | No | Yes |

Use `useCapabilities()` or `useFeature()` to conditionally enable features.

### Modal Guidance

- Prefer local/in-widget modals for cross-host compatibility.
- Use `window.openai.requestModal()` only when you specifically need a ChatGPT-hosted modal template.
- Always feature-detect and provide a fallback:

```ts
if (typeof window !== "undefined" && window.openai?.requestModal) {
  await window.openai.requestModal({ title: "Details", params: { id } });
} else {
  // Fallback: local modal state or route navigation
}
```

## Exporting for Production

```bash
npm run export
```

Defaults for `--entry` and `--export-name` are read from `mcp-app-studio.config.json` (written by the CLI when you scaffold a project). You can override them via flags.

Generates:

```
export/
├── widget/
│   └── index.html      Self-contained widget
├── manifest.json       App manifest
└── README.md           Deployment instructions
```

The exported widget uses the `mcp-app-studio` SDK which automatically detects the host platform and uses the appropriate bridge.

## Deploying

### Widget

Deploy `export/widget/` to any static host:

```bash
# Vercel
cd export/widget && vercel deploy

# Netlify
netlify deploy --dir=export/widget

# Or any static host (S3, Cloudflare Pages, etc.)
```

### MCP Server

If you have a `server/` directory:

```bash
cd server
npm run build
# Deploy to Vercel, Railway, Fly.io, etc.
```

### Register with Platform

**For ChatGPT:**
1. Update `manifest.json` with your deployed widget URL
2. Go to [ChatGPT Apps dashboard](https://chatgpt.com/apps)
3. Create a new app and connect your MCP server
4. Test in a new ChatGPT conversation

**For Claude Desktop:**
1. Configure your MCP server in Claude Desktop settings
2. The widget will render when tools with UI are invoked

## Configuration

### SDK Guide (Optional)

The workbench includes an AI-powered SDK guide. To enable:

```bash
cp .env.example .env.local
# then set:
# OPENAI_API_KEY="your-key"
```

### MCP Server CORS

For production, restrict CORS to your widget domain:

```bash
cp server/.env.example server/.env
# then set:
# CORS_ORIGIN=https://your-widget-domain.com
```

### Dark Mode

Exported widgets inherit the host's theme. Ensure your CSS responds to `.dark`:

```css
.dark .my-element {
  background: #1a1a1a;
}
```

## Learn More

- [MCP App Studio](https://github.com/assistant-ui/assistant-ui/tree/main/packages/mcp-app-studio) — CLI and SDK documentation
- [MCP Specification](https://modelcontextprotocol.io/specification/) — Model Context Protocol
- [ChatGPT MCP Apps](https://developers.openai.com/apps-sdk/mcp-apps-in-chatgpt) — ChatGPT as an MCP host
