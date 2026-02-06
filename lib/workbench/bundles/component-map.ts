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

export function getWorkbenchComponentConfig(componentId: string) {
  return WORKBENCH_COMPONENT_MAP[componentId];
}
