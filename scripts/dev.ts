#!/usr/bin/env tsx
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SERVER_DIR = join(ROOT, "server");
const hasServer = existsSync(join(SERVER_DIR, "package.json"));

console.log("\n\x1b[2mStarting development...\x1b[0m\n");
console.log("  \x1b[36m→\x1b[0m Next.js:    http://localhost:3002");
if (hasServer) {
  console.log("  \x1b[35m→\x1b[0m MCP Server: http://localhost:3001/mcp");
}
console.log();

// Start Next.js
spawn("npx", ["next", "dev", "-p", "3002"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: process.platform === "win32",
});

// Start MCP server if exists
if (hasServer) {
  spawn("npm", ["run", "dev"], {
    cwd: SERVER_DIR,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}
