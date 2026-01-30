#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { detectPackageManager, installArgs } from "./pm";

const ROOT = process.cwd();
const SERVER_DIR = join(ROOT, "server");

const hasServer = existsSync(join(SERVER_DIR, "package.json"));
if (!hasServer) process.exit(0);

const hasNodeModules = existsSync(join(SERVER_DIR, "node_modules"));
const hasYarnPnp = existsSync(join(SERVER_DIR, ".pnp.cjs"));
if (hasNodeModules || hasYarnPnp) process.exit(0);

const pm = detectPackageManager(ROOT);
const cmd = installArgs(pm);

console.log(`\n\x1b[2mInstalling server dependencies (${pm})...\x1b[0m\n`);

const result = spawnSync(cmd.command, cmd.args, {
  cwd: SERVER_DIR,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
