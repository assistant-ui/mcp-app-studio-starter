"use client";

import type { ComponentType } from "react";
import {
  POI_MAP_DEMO_INPUT,
  WELCOME_CARD_DEMO_INPUT,
} from "@/lib/workbench/demo/default-props";
import { POIMapSDK, WelcomeCardSDK } from "./wrappers";

export type ComponentCategory = "cards" | "lists" | "forms" | "data";

type AnyComponent = ComponentType<any>;

export interface WorkbenchComponentEntry {
  id: string;
  label: string;
  description: string;
  category: ComponentCategory;
  component: AnyComponent;
  defaultProps: Record<string, unknown>;
  exportConfig: {
    entryPoint: string;
    exportName: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// App Configuration
// ─────────────────────────────────────────────────────────────────────────────
// Each project has a single app configured here.
//
// Workbench note:
// - In production, the primary contract is MCP Apps (via `mcp-app-studio`).
// - In the local workbench, we simulate ChatGPT's optional extensions API
//   (`window.openai`) so widgets can still be exercised without an MCP host.
// ─────────────────────────────────────────────────────────────────────────────

export const appComponent: WorkbenchComponentEntry = {
  id: "poi-map",
  label: "Places App Demo",
  description: "An interactive places discovery app with map and search",
  category: "data",
  component: POIMapSDK,
  defaultProps: POI_MAP_DEMO_INPUT,
  exportConfig: {
    entryPoint: "lib/workbench/wrappers/poi-map-sdk.tsx",
    exportName: "POIMapSDK",
  },
};

const welcomeComponent: WorkbenchComponentEntry = {
  id: "welcome",
  label: "Welcome",
  description: "A simple starter app - the perfect starting point",
  category: "cards",
  component: WelcomeCardSDK,
  defaultProps: WELCOME_CARD_DEMO_INPUT,
  exportConfig: {
    entryPoint: "lib/workbench/wrappers/welcome-card-sdk.tsx",
    exportName: "WelcomeCardSDK",
  },
};

export const workbenchComponents: WorkbenchComponentEntry[] = [
  appComponent,
  welcomeComponent,
];

export function getComponent(id: string): WorkbenchComponentEntry | undefined {
  return workbenchComponents.find((c) => c.id === id);
}

export function getComponentIds(): string[] {
  return workbenchComponents.map((c) => c.id);
}
