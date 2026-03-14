# Workbench (Dev Only)

The workbench is a **local MCP Apps host simulator** for developing embedded UIs.

- Widgets are previewed in an iframe (matching the MCP Apps runtime model).
- The host-side bridge uses `AppBridge` from `@modelcontextprotocol/ext-apps`
  (standard `ui/*` JSON-RPC over `postMessage`).
- We also install a `window.openai` shim inside the iframe so widgets can
  exercise **ChatGPT-only extensions** (widgetState, file uploads, host modals,
  open-in-app links, and checkout beta)
  during development.

## Demo Bundles

- In development, `?demo=true` uses a fresh bundle from `/api/workbench/bundle?...&demo=true` so demo previews reflect source edits immediately.
- In production, demo previews use the prebuilt files in `public/workbench-bundles/`.

## Theming Contract

Use the shared framework-agnostic contract:

- `data-theme` + semantic CSS variables (host-driven)
- one local theme boundary at widget root
- no hardcoded light/dark color assumptions

Reference: `lib/workbench/THEMING_CONTRACT.md`

## Theme State Separation (Agent-Critical)

The workbench intentionally has two separate theme states:

- `theme`: global shell/chrome theme (header, panels, surrounding app UI)
- `previewTheme`: widget preview theme (iframe/runtime simulation)

Do not auto-sync these states. This separation is intentional for debugging and
cross-host simulation.

- `setTheme(...)` must not mutate `previewTheme`.
- URL `theme` hydration should update only `theme`.
- `previewTheme` is controlled independently (preview controls + persisted
  preferences).

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

`widgetState` is an OpenAI/ChatGPT host-managed state channel, not a standard
MCP Apps persistence primitive. For portable MCP Apps, use app-managed
persistence such as localStorage or server-backed tools.

Tool result metadata lives on the tool result itself as `_meta`. In ChatGPT
that metadata is also exposed to widgets as `toolResponseMetadata`. In the
workbench UI, author tool result metadata in Simulation and inspect it in
Activity.

## Where To Look

- Host simulation (MCP + ChatGPT extensions): `lib/workbench/iframe/widget-iframe-host.tsx`
- ChatGPT extensions shim inside the iframe: `lib/workbench/iframe/generate-iframe-html.ts`
