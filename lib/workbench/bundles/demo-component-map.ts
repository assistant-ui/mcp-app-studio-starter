import fs from "node:fs";
import path from "node:path";
import type { ComponentConfig } from "./component-map";

export const WORKBENCH_DEMO_COMPONENT_MAP: Record<string, ComponentConfig> = {
  welcome: {
    entryFile: "lib/workbench/demo/welcome-card-demo.tsx",
    exportName: "WelcomeCardDemo",
  },
  "poi-map": {
    entryFile: "lib/workbench/demo/poi-map-demo.tsx",
    exportName: "POIMapDemo",
  },
};

function hasEntryFile(projectRoot: string, config: ComponentConfig) {
  return fs.existsSync(path.resolve(projectRoot, config.entryFile));
}

export function getWorkbenchDemoComponentConfig(
  componentId: string,
  projectRoot = process.cwd(),
) {
  const config = WORKBENCH_DEMO_COMPONENT_MAP[componentId];
  if (!config) return undefined;
  return hasEntryFile(projectRoot, config) ? config : undefined;
}

export function getWorkbenchDemoComponentEntries(projectRoot = process.cwd()) {
  return Object.entries(WORKBENCH_DEMO_COMPONENT_MAP).filter(([, config]) =>
    hasEntryFile(projectRoot, config),
  );
}
