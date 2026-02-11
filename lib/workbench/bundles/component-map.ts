import fs from "node:fs";
import path from "node:path";
import { componentConfigs } from "../component-configs";

export interface ComponentConfig {
  entryFile: string;
  exportName?: string;
}

// Derive the bundle maps from the single source of truth in component-configs.ts.
// No need to manually duplicate entries here when adding new components.

export const WORKBENCH_COMPONENT_MAP: Record<string, ComponentConfig> =
  Object.fromEntries(
    componentConfigs.map((c) => [
      c.id,
      {
        entryFile: c.exportConfig.entryPoint,
        exportName: c.exportConfig.exportName,
      },
    ]),
  );

export const WORKBENCH_DEMO_COMPONENT_MAP: Record<string, ComponentConfig> =
  Object.fromEntries(
    componentConfigs
      .filter((c) => c.demoConfig != null)
      .map((c) => [
        c.id,
        {
          entryFile: c.demoConfig!.entryPoint,
          exportName: c.demoConfig!.exportName,
        },
      ]),
  );

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
