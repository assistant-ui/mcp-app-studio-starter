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

function getComponentConfigFromMap(
  componentMap: Record<string, ComponentConfig>,
  componentId: string,
  projectRoot: string,
) {
  const config = componentMap[componentId];
  if (!config) return undefined;
  return hasEntryFile(projectRoot, config) ? config : undefined;
}

function getComponentEntriesFromMap(
  componentMap: Record<string, ComponentConfig>,
  projectRoot: string,
) {
  return Object.entries(componentMap).filter(([, config]) =>
    hasEntryFile(projectRoot, config),
  );
}

export function getWorkbenchComponentConfig(
  componentId: string,
  projectRoot = process.cwd(),
) {
  return getComponentConfigFromMap(
    WORKBENCH_COMPONENT_MAP,
    componentId,
    projectRoot,
  );
}

export function getWorkbenchComponentEntries(projectRoot = process.cwd()) {
  return getComponentEntriesFromMap(WORKBENCH_COMPONENT_MAP, projectRoot);
}

export function getWorkbenchDemoComponentConfig(
  componentId: string,
  projectRoot = process.cwd(),
) {
  return getComponentConfigFromMap(
    WORKBENCH_DEMO_COMPONENT_MAP,
    componentId,
    projectRoot,
  );
}

export function getWorkbenchDemoComponentEntries(projectRoot = process.cwd()) {
  return getComponentEntriesFromMap(WORKBENCH_DEMO_COMPONENT_MAP, projectRoot);
}
