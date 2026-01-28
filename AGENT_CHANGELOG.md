# Agent Changelog

> This file helps coding agents understand project evolution, key decisions,
> and deprecated patterns. Updated: 2026-01-28

## Current State Summary

MCP App Studio Starter is a template for building widgets that run on both ChatGPT and MCP hosts (Claude Desktop, etc.). The workbench operates in **universal mode** where all platform features are available for testing. Widgets automatically adapt to the actual platform when deployed using the `mcp-app-studio` SDK.

## Stale Information Detected

None currently. Documentation was updated in the 2026-01-28 commit to reflect universal mode.

## Timeline

### 2026-01-28 - SDK Guide MCP Integration

**What changed:**
- Replaced bundled SDK documentation (~228KB `docs-index.ts`) with live OpenAI Docs MCP server
- SDK Guide assistant now queries `https://developers.openai.com/mcp` for documentation
- Removed `lib/workbench/sdk-guide/docs-index.ts` and `lib/workbench/sdk-guide/retrieve-docs.ts`
- Added `@ai-sdk/mcp` package for MCP client connectivity
- Updated `app/api/sdk-guide/route.ts` to use `createMCPClient` with SSE transport

**Why:** Always up-to-date documentation from the official source. Eliminates the maintenance burden of keeping bundled docs in sync with OpenAI's releases.

**Agent impact:**
- SDK Guide now has access to the full OpenAI documentation corpus
- Documentation is always current - no manual updates needed
- The `search_openai_docs`, `fetch_openai_doc`, and `list_openai_docs` tools are available

**Technical details:**
- MCP client connects via SSE transport to `https://developers.openai.com/mcp`
- Connection is cached for the lifetime of the Edge runtime instance
- Graceful fallback if MCP server is unavailable (workbench tools still work)

---

### 2026-01-28 - Universal Mode & Simplified DX

**What changed:**
- Removed platform toggle from workbench toolbar
- `useCapabilities()` now returns ALL features (superset of both platforms)
- Added mock implementations for unified hooks: `usePersistentState`, `useModelContext`, `useToolInputStatus`, `useChatGPTBridge`, `useMCPBridge`
- Added platform compatibility section to export dialog
- Updated README and lib/workbench/README.md to document universal mode

**Why:** Progressive disclosure design philosophy - 90% of developers should never think about platform differences. Platform toggle was confusing and created unnecessary cognitive overhead.

**Agent impact:**
- Workbench now shows all features always - no need to switch platforms to test
- When writing widgets, prefer universal hooks over platform-specific ones
- Export dialog shows compatibility info - check there for deployment concerns

**Deprecated:**
- Platform toggle UI (removed entirely)
- Platform-gated behavior in workbench hooks (all hooks now work in universal mode)

---

### 2026-01-27 - mcp-app-studio SDK Integration

**What changed:**
- Integrated `mcp-app-studio` SDK (^0.4.0) for multi-platform support
- Added platform-aware hooks: `usePlatform`, `useCapabilities`, `useFeature`, `useToolInputPartial`, `useUpdateModelContext`, `useLog`
- Added platform toggle to workbench (later removed in 2026-01-28)
- Updated POI Map example to use capabilities for conditional features
- `lib/sdk/index.ts` now re-exports from `mcp-app-studio` package

**Why:** Enable building widgets that work on both ChatGPT Apps SDK and MCP hosts with the same codebase.

**Agent impact:**
- Import production hooks from `@/lib/sdk` or `mcp-app-studio`
- Import workbench hooks from `@/lib/workbench` for local development
- Use `useCapabilities()` to check feature availability before using platform-specific hooks

---

### 2026-01-26 - Rename to mcp-app-studio-starter

**What changed:**
- Renamed project from `chatgpt-app-studio-starter` to `mcp-app-studio-starter`
- Updated all branding, URLs, and documentation

**Why:** Reflect that this is no longer ChatGPT-only; it supports multiple AI platforms via MCP.

**Agent impact:**
- Repository URL: `github.com/assistant-ui/mcp-app-studio-starter`
- NPM dependency: `mcp-app-studio` (not chatgpt-app-studio)

---

### 2026-01-19 - Initial Creation

**What changed:** Initial project scaffolding with workbench, POI Map example, and export functionality.

## Deprecated Patterns

| Don't | Do Instead | Deprecated Since |
|-------|------------|------------------|
| Check `platform === "mcp"` before calling hooks | All hooks work in workbench universal mode | 2026-01-28 |
| Import from `chatgpt-app-studio` | Import from `mcp-app-studio` | 2026-01-26 |
| Use platform toggle in workbench | All features available by default | 2026-01-28 |
| Gate features with `if (platform === "chatgpt")` in workbench | Use `useCapabilities()` / `useFeature()` for production, all work in workbench | 2026-01-28 |
| Import from `lib/workbench/sdk-guide/retrieve-docs` | SDK Guide now uses MCP server directly | 2026-01-28 |
| Bundle SDK documentation in `docs-index.ts` | Documentation served from OpenAI Docs MCP server | 2026-01-28 |

## Hook Categories

### Level 1: Universal Hooks (Use These)
- `useToolInput<T>()` - Input from tool call
- `useTheme()` - Current theme
- `useCallTool()` - Call backend tools
- `useDisplayMode()` - Get/set display mode
- `useSendMessage()` - Send messages to conversation

### Level 2: Feature Detection (When Needed)
- `usePlatform()` - Returns "chatgpt" or "mcp"
- `useCapabilities()` - Full capability object
- `useFeature(name)` - Check specific feature

### Level 3: Platform-Specific (Advanced)
- `useWidgetState()` - ChatGPT only, persistent state
- `useUpdateModelContext()` - MCP only, model context updates
- `useToolInputPartial()` - MCP only, streaming input
- `useLog()` - MCP only, structured logging

## Trajectory

The project is moving toward **platform-agnostic development**:
1. Universal hooks abstract platform differences
2. Feature detection via `useCapabilities()` for edge cases
3. Export dialog provides deployment guidance
4. Future SDK PRs will add true implementations of `usePersistentState`, `useModelContext`, `useToolInputStatus` that work across platforms

## Key Files

| File | Purpose |
|------|---------|
| `app/api/sdk-guide/route.ts` | SDK Guide API - connects to OpenAI Docs MCP server |
| `lib/workbench/platform-hooks.ts` | Platform detection and unified hook mocks |
| `lib/workbench/openai-context.tsx` | ChatGPT bridge simulation |
| `lib/sdk/index.ts` | Production SDK re-exports |
| `components/workbench/preview-toolbar.tsx` | Workbench toolbar (no platform toggle) |
| `components/workbench/export-popover.tsx` | Export with compatibility info |
