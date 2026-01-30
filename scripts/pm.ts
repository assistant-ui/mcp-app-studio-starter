import { existsSync } from "node:fs";
import { join } from "node:path";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

function detectFromUserAgent(ua: string): PackageManager | null {
  if (ua.includes("pnpm")) return "pnpm";
  if (ua.includes("yarn")) return "yarn";
  if (ua.includes("bun")) return "bun";
  if (ua.includes("npm")) return "npm";
  return null;
}

/**
 * Detect the package manager for this repo.
 *
 * Strategy:
 * - User agent first (best signal when invoked via `pm run ...`)
 * - Lockfile fallback (best signal when invoked directly)
 */
export function detectPackageManager(
  cwd: string = process.cwd(),
): PackageManager {
  const ua = process.env["npm_config_user_agent"] ?? "";
  const fromUa = detectFromUserAgent(ua);
  if (fromUa) return fromUa;

  if (existsSync(join(cwd, "bun.lockb")) || existsSync(join(cwd, "bun.lock"))) {
    return "bun";
  }
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
  if (
    existsSync(join(cwd, "package-lock.json")) ||
    existsSync(join(cwd, "npm-shrinkwrap.json"))
  ) {
    return "npm";
  }

  return "npm";
}

export function runScriptArgs(
  pm: PackageManager,
  script: string,
  extraArgs: string[] = [],
): { command: string; args: string[] } {
  const argsPrefix = ["run"];
  return { command: pm, args: [...argsPrefix, script, ...extraArgs] };
}

export function installArgs(
  pm: PackageManager,
  extraArgs: string[] = [],
): { command: string; args: string[] } {
  return { command: pm, args: ["install", ...extraArgs] };
}
