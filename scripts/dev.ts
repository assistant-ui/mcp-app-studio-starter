#!/usr/bin/env tsx
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { detectPackageManager, runScriptArgs } from "./pm";

const ROOT = process.cwd();
const SERVER_DIR = join(ROOT, "server");
const hasServer = existsSync(join(SERVER_DIR, "package.json"));

const pm = detectPackageManager(ROOT);

const children: ChildProcess[] = [];

function tryKill(pid: number, signal: NodeJS.Signals): boolean {
  if (!pid) return false;

  // On POSIX, attempt to kill the whole process group first (best-effort).
  if (process.platform !== "win32") {
    try {
      process.kill(-pid, signal);
      return true;
    } catch {
      // fall back to direct kill below
    }
  }

  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

async function isPortAvailable(port: number): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const server = net.createServer();
    server.unref();

    server.once("error", () => resolve(false));
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(
  startPort: number,
  opts?: { maxTries?: number; exclude?: Set<number> },
): Promise<number> {
  const maxTries = opts?.maxTries ?? 20;
  const exclude = opts?.exclude ?? new Set<number>();

  for (let i = 0; i < maxTries; i++) {
    const port = startPort + i;
    if (exclude.has(port)) continue;
    if (await isPortAvailable(port)) return port;
  }

  throw new Error(
    `No available port found starting at ${startPort} (tried ${maxTries} ports).`,
  );
}

let cleaningUp = false;
async function cleanup(exitCode: number = 0) {
  if (cleaningUp) return;
  cleaningUp = true;

  // First try a graceful stop.
  for (const child of children) {
    if (child.pid) {
      tryKill(child.pid, "SIGTERM");
    }
  }

  // Give processes a moment to exit cleanly, then force kill anything still up.
  await delay(750);
  for (const child of children) {
    if (child.pid && child.exitCode == null) {
      tryKill(child.pid, "SIGKILL");
    }
  }

  process.exit(exitCode);
}

process.on("SIGINT", () => void cleanup(0));
process.on("SIGTERM", () => void cleanup(0));
process.on("SIGHUP", () => void cleanup(0));
process.on("uncaughtException", (err) => {
  console.error(err);
  void cleanup(1);
});
process.on("unhandledRejection", (err) => {
  console.error(err);
  void cleanup(1);
});

const DEFAULT_NEXT_PORT = 3002;
const DEFAULT_MCP_PORT = Number(process.env.PORT ?? "3001") || 3001;

async function main() {
  const NEXT_PORT = await findAvailablePort(DEFAULT_NEXT_PORT);

  const MCP_PORT = hasServer
    ? await findAvailablePort(DEFAULT_MCP_PORT, {
        // Avoid conflicting with Next's resolved port.
        exclude: new Set([NEXT_PORT]),
      })
    : null;

  console.log("\n\x1b[2mStarting development...\x1b[0m\n");
  console.log(`  \x1b[90m•\x1b[0m Package manager: ${pm}`);
  console.log(`  \x1b[36m→\x1b[0m Next.js:    http://localhost:${NEXT_PORT}`);
  if (hasServer) {
    console.log(
      `  \x1b[35m→\x1b[0m MCP Server: http://localhost:${MCP_PORT}/mcp`,
    );
  }
  console.log();

  // Start Next.js directly (bypasses dev:next to allow dynamic port)
  const nextProcess = spawn("npx", ["next", "dev", "-p", String(NEXT_PORT)], {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    detached: process.platform !== "win32",
  });
  children.push(nextProcess);

  // Start MCP server if exists
  if (hasServer) {
    if (MCP_PORT == null) {
      throw new Error("Internal error: MCP_PORT was not resolved");
    }

    const serverCmd = runScriptArgs(pm, "dev");
    const serverProcess = spawn(serverCmd.command, serverCmd.args, {
      cwd: SERVER_DIR,
      stdio: "inherit",
      shell: process.platform === "win32",
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        PORT: String(MCP_PORT),
      },
    });
    children.push(serverProcess);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
