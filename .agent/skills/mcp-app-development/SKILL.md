---
name: mcp-app-development
description: Build and debug MCP Apps in capability slices with TDD and real MCP parity proof, avoiding mock-only false confidence.
---

# MCP App Development Skill

Use this skill when building or debugging MCP Apps in this repo with a coding agent.

## Outcome
Ship capability slices quickly without fake confidence.

A slice is only done when **UI + real MCP tool + parity proof** are complete.

## Non-Negotiable Rule
Mock-only success is never ship-ready success.

- Mocks/sim are allowed for rapid iteration.
- Completion requires real MCP checks.

## Default Slice Workflow (80/20)
For every user request, execute this as one chunk of work:

1. Define capability slice
- User action in plain language
- Tool contract: name, args, response shape
- Done criteria (observable)

2. Write failing parity tests first (TDD red)
- `tools/list` includes required tool(s)
- `tools/call` succeeds with fixture args
- Expected output shape is returned

3. Implement UI behavior
- Wrapper/component calls tool via `useCallTool`
- Keep UI logic thin; tool does data mutation/retrieval

4. Implement real server tool
- Add handler in `server/src/tools/`
- Register tool in `server/src/index.ts`
- Return structured, debuggable output

5. Prove real parity (TDD green)
- Run tests
- Run validation through real MCP path
- Record status: `success | partial | blocked`

6. Only then iterate polish
- Better error states
- Better loading states
- Better copy/UX

## Completion Semantics
Use these exact statuses:

- `success`: all required real parity checks passed
- `partial`: meaningful progress, at least one required check still failing
- `blocked`: cannot continue without external dependency/input

Never report `success` if validation evidence is mock/sim only.

## Where To Edit
- Workbench host execution path: `lib/workbench/iframe/widget-iframe-host.tsx`
- MCP proxy bridge: `app/api/mcp-proxy/route.ts`
- MCP client: `lib/workbench/mcp-client.ts`
- Server tool registration: `server/src/index.ts`
- Server tool handlers: `server/src/tools/*.ts`
- UI wrappers that call tools: `lib/workbench/wrappers/*.tsx`
- Exported server tool generation: `lib/export/mcp-server/generate-tools.ts`

## Real Validation Contract (Simple)
For an impacted wrapper, validate:

1. Discovery check
- Call `tools/list`
- Assert required tool names exist

2. Execution check
- Call each required tool once with fixture args
- Assert non-error response and expected shape

3. Status output
- Emit one summary object:

```json
{
  "status": "success | partial | blocked",
  "requiredTools": ["..."],
  "missingTools": ["..."],
  "failingCalls": [{ "tool": "...", "reason": "..." }],
  "evidence": ["test names or run ids"]
}
```

## Debugging Heuristic
If UI works in workbench but real validation fails:

1. Check `tools/list` for missing registration
2. Check server handler input schema vs wrapper args mismatch
3. Check handler output shape mismatch vs UI expectations
4. Check proxy/server URL/session issues

Fix parity first, then continue UI polish.

## Minimal Agent Prompt Template
Use this when delegating to a coding agent:

```md
Implement this as one capability slice: [describe action].

Requirements:
1. Write failing tests first for real MCP parity (`tools/list` + `tools/call`).
2. Implement both UI and MCP server tool(s) in one pass.
3. Make tests pass.
4. Return completion status as `success | partial | blocked` with evidence.

Constraint: do not report success from mock-only behavior.
```

## Anti-Patterns
- Building UI against mocks without creating real tools
- Reporting done without parity evidence
- Creating workflow-heavy tools that hide logic from the agent
- Deferring tests until after implementation

## Practical Scope Control
Keep the first slice small:

- Prefer one wrapper + one to three tools
- Prefer fixture-driven parity checks over full e2e automation
- Defer comprehensive telemetry and orchestration until repeated pain proves need
