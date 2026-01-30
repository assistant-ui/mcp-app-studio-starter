#!/usr/bin/env tsx
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function parsePort(value: string | undefined): number | null {
  if (!value) return null;
  const port = Number.parseInt(value, 10);
  if (!Number.isFinite(port)) return null;
  if (port <= 0 || port > 65535) return null;
  return port;
}

function readPortFromFile(): number | null {
  try {
    const filePath = path.join(process.cwd(), ".mcp-port");
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8").trim();
    return parsePort(raw);
  } catch {
    return null;
  }
}

const port = parsePort(process.env.PORT) ?? readPortFromFile() ?? 3001;
const url = `http://localhost:${port}/mcp`;

console.log(`\n\x1b[2mLaunching MCP Inspector:\x1b[0m ${url}\n`);

const child = spawn("npx", ["@modelcontextprotocol/inspector@latest", url], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});

