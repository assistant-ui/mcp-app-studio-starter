import fs from "node:fs";
import path from "node:path";

export interface ComponentConfig {
  entryFile: string;
  exportName?: string;
}

export const WORKBENCH_COMPONENT_MAP: Record<string, ComponentConfig> = {
  welcome: {
    entryFile: "lib/workbench/wrappers/welcome-card-sdk.tsx",
    exportName: "WelcomeCardSDK",
  },
  "poi-map": {
    entryFile: "lib/workbench/wrappers/poi-map-sdk.tsx",
    exportName: "POIMapSDK",
  },
};

function hasEntryFile(projectRoot: string, config: ComponentConfig) {
  return fs.existsSync(path.resolve(projectRoot, config.entryFile));
}

export function getWorkbenchComponentConfig(
  componentId: string,
  projectRoot = process.cwd(),
) {
  const config = WORKBENCH_COMPONENT_MAP[componentId];
  if (!config) return undefined;
  return hasEntryFile(projectRoot, config) ? config : undefined;
}

export function getWorkbenchComponentEntries(projectRoot = process.cwd()) {
  return Object.entries(WORKBENCH_COMPONENT_MAP).filter(([, config]) =>
    hasEntryFile(projectRoot, config),
  );
}
