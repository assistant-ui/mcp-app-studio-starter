# Workbench (Dev Only)

The workbench is a **local MCP Apps host simulator** for developing embedded UIs.

- Widgets are previewed in an iframe (matching the MCP Apps runtime model).
- The host-side bridge uses `AppBridge` from `@modelcontextprotocol/ext-apps`
  (standard `ui/*` JSON-RPC over `postMessage`).
- We also install a `window.openai` shim inside the iframe so widgets can
  exercise **ChatGPT-only extensions** (widgetState, file uploads, host modals)
  during development.

## Why You Might See `openai/*` References

There are two kinds of "OpenAI/ChatGPT" references you may see in workbench code:

1. `window.openai` inside the iframe:
   ChatGPT may expose optional extensions via `window.openai`. These are **not**
   part of the MCP Apps standard. Portable widgets should rely on MCP first and
   only use these when `useFeature(...)` indicates they're available.
2. `_meta["openai/widgetSessionId"]` / `_meta["openai/closeWidget"]`:
   These are **workbench-only compatibility metadata keys** used to correlate
   tool calls with the current preview session and to simulate host-driven close
   behavior. Non-ChatGPT hosts should ignore them.

## Where To Look

- Host simulation (MCP + ChatGPT extensions): `lib/workbench/iframe/widget-iframe-host.tsx`
- ChatGPT extensions shim inside the iframe: `lib/workbench/iframe/generate-iframe-html.ts`

