# MCP App Studio Starter

Starter template for building interactive apps for AI assistants with [MCP App Studio](https://github.com/assistant-ui/assistant-ui/tree/main/packages/mcp-app-studio).

> **Note:** This template is automatically downloaded when you run `npx mcp-app-studio`. You don't need to clone this repo directly.

## Supported Platforms

Build once, deploy anywhere:

- **ChatGPT** — via the ChatGPT Apps SDK
- **Claude Desktop** — via the Model Context Protocol (MCP)
- **Any MCP Host** — compatible with any MCP-supporting AI assistant

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3002 — you're in the workbench.

The workbench includes a **Platform Toggle** that lets you preview your widget's behavior on both ChatGPT and MCP platforms.

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
  usePlatform,
  useCapabilities,
} from "@/lib/workbench";

export function MyWidget() {
  const input = useToolInput<{ query: string }>();
  const callTool = useCallTool();
  const theme = useTheme();
  const platform = usePlatform();
  const capabilities = useCapabilities();

  const handleSearch = async () => {
    const result = await callTool("search", { query: input.query });
    console.log(result.structuredContent);
  };

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <p>Query: {input.query}</p>
      <p>Running on: {platform}</p>
      <button onClick={handleSearch}>Search</button>

      {/* Platform-specific features */}
      {capabilities.widgetState && (
        <p>Widget state is available (ChatGPT only)</p>
      )}
      {capabilities.modelContext && (
        <p>Model context updates available (MCP only)</p>
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

**Platform detection:**
- `usePlatform()` — `"chatgpt"` or `"mcp"`
- `useCapabilities()` — Platform-specific capabilities object
- `useFeature(name)` — Check if a specific feature is available

**Reading state:**
- `useToolInput<T>()` — Input from the tool call
- `useToolInputPartial<T>()` — Partial input during streaming (MCP only)
- `useToolOutput<T>()` — Response from most recent tool call
- `useTheme()` — `"light"` or `"dark"`
- `useDisplayMode()` — `"inline"`, `"pip"`, or `"fullscreen"`
- `useWidgetState<T>()` — Persistent widget state (ChatGPT only)

**Calling methods:**
- `useCallTool()` — Call MCP tools
- `useRequestDisplayMode()` — Request display mode change
- `useSendFollowUpMessage()` — Send message to assistant
- `useOpenExternal()` — Open URL in new tab
- `useUpdateModelContext()` — Update model context (MCP only)
- `useLog()` — Structured logging (MCP only)

## Platform-Specific Features

| Feature | ChatGPT | MCP |
| ------- | ------- | --- |
| Widget State | Yes | No |
| Tool Input Partial | No | Yes |
| Model Context Updates | No | Yes |
| Structured Logging | No | Yes |
| File Upload | Yes | No |
| Display Mode Transitions | Yes | Yes |

Use `useCapabilities()` or `useFeature()` to conditionally enable features.

## Exporting for Production

```bash
npm run export
```

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
# .env.local
OPENAI_API_KEY="your-key"
```

### MCP Server CORS

For production, restrict CORS to your widget domain:

```bash
# server/.env
CORS_ORIGIN=https://your-widget-domain.com
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
- [ChatGPT Apps SDK](https://developers.openai.com/apps-sdk/) — ChatGPT integration
