/**
 * Shared component configuration data.
 *
 * This is the single source of truth for component ID → entry point mappings.
 * Used by both the client-side component-registry and the Node-side bundle map.
 *
 * Keep this file free of React, Node, or browser-specific imports so it can
 * be consumed in any environment.
 */

export interface ComponentExportConfig {
  entryPoint: string;
  exportName: string;
}

export interface ComponentMeta {
  id: string;
  label: string;
  description: string;
  category: "cards" | "lists" | "forms" | "data";
  exportConfig: ComponentExportConfig;
  demoConfig?: {
    entryPoint: string;
    exportName: string;
  };
}

export const componentConfigs: ComponentMeta[] = [
  {
    id: "poi-map",
    label: "Places App Demo",
    description: "An interactive places discovery app with map and search",
    category: "data",
    exportConfig: {
      entryPoint: "lib/workbench/wrappers/poi-map-sdk.tsx",
      exportName: "POIMapSDK",
    },
    demoConfig: {
      entryPoint: "lib/workbench/demo/poi-map-demo.tsx",
      exportName: "POIMapDemo",
    },
  },
  {
    id: "welcome",
    label: "Welcome",
    description: "A simple starter app - the perfect starting point",
    category: "cards",
    exportConfig: {
      entryPoint: "lib/workbench/wrappers/welcome-card-sdk.tsx",
      exportName: "WelcomeCardSDK",
    },
    demoConfig: {
      entryPoint: "lib/workbench/demo/welcome-card-demo.tsx",
      exportName: "WelcomeCardDemo",
    },
  },
];
