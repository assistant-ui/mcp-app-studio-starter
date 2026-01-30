#!/usr/bin/env tsx
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { detectPackageManager, runScriptArgs } from "./pm";

const ROOT = process.cwd();
const SERVER_DIR = join(ROOT, "server");
const hasServer = existsSync(join(SERVER_DIR, "package.json"));

const pm = detectPackageManager(ROOT);

const children: ChildProcess[] = [];

function cleanup() {
  for (const child of children) {
    if (child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        try {
          child.kill("SIGTERM");
        } catch {
          // Process already exited
        }
      }
    }
  }
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("SIGHUP", cleanup);

console.log("\n\x1b[2mStarting development...\x1b[0m\n");
console.log(`  \x1b[90m•\x1b[0m Package manager: ${pm}`);
console.log("  \x1b[36m→\x1b[0m Next.js:    http://localhost:3002");
if (hasServer) {
  console.log("  \x1b[35m→\x1b[0m MCP Server: http://localhost:3001/mcp");
}
console.log();

// Start Next.js
const nextCmd = runScriptArgs(pm, "dev:next");
const nextProcess = spawn(nextCmd.command, nextCmd.args, {
  cwd: ROOT,
  stdio: "inherit",
  shell: process.platform === "win32",
  detached: process.platform !== "win32",
});
children.push(nextProcess);

// Start MCP server if exists
if (hasServer) {
  const serverCmd = runScriptArgs(pm, "dev");
  const serverProcess = spawn(serverCmd.command, serverCmd.args, {
    cwd: SERVER_DIR,
    stdio: "inherit",
    shell: process.platform === "win32",
    detached: process.platform !== "win32",
  });
  children.push(serverProcess);
}
