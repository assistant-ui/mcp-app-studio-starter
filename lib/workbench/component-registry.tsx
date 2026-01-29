"use client";

import type { ComponentType } from "react";
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
// Each project has a single app configured here. This component uses the SDK
// context (OpenAIProvider) to interact with the window.openai API - display
// modes, widget state, tool calls, modals, etc.
// ─────────────────────────────────────────────────────────────────────────────

export const appComponent: WorkbenchComponentEntry = {
  id: "poi-map",
  label: "Places App Demo",
  description: "An interactive places discovery app with map and search",
  category: "data",
  component: POIMapSDK,
  defaultProps: {},
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
  defaultProps: {
    title: "Welcome!",
    message:
      "This is your MCP App. Edit this component to build something amazing.",
  },
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
