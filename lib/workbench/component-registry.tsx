"use client";

import type { ComponentType } from "react";
import {
  MOVIE_WATCHLIST_DEMO_INPUT,
  POI_MAP_DEMO_INPUT,
  WELCOME_CARD_DEMO_INPUT,
} from "@/lib/workbench/demo/default-props";
import { componentConfigs } from "./component-configs";
import { MovieWatchlistSDK, POIMapSDK, WelcomeCardSDK } from "./wrappers";

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
// Metadata (id, label, description, category, exportConfig) comes from the
// shared component-configs.ts — the single source of truth for both the
// client-side registry and the Node-side bundle map.
//
// This file adds the React-specific parts: the component reference and
// default props for workbench preview.
// ─────────────────────────────────────────────────────────────────────────────

const componentMap: Record<
  string,
  { component: AnyComponent; defaultProps: Record<string, unknown> }
> = {
  "poi-map": { component: POIMapSDK, defaultProps: POI_MAP_DEMO_INPUT },
  "movie-watchlist": {
    component: MovieWatchlistSDK,
    defaultProps: MOVIE_WATCHLIST_DEMO_INPUT,
  },
  welcome: { component: WelcomeCardSDK, defaultProps: WELCOME_CARD_DEMO_INPUT },
};

export const workbenchComponents: WorkbenchComponentEntry[] =
  componentConfigs
    .filter((config) => config.id in componentMap)
    .map((config) => ({
      ...config,
      ...componentMap[config.id],
      exportConfig: config.exportConfig,
    }));

export const appComponent: WorkbenchComponentEntry = workbenchComponents[0];

export function getComponent(id: string): WorkbenchComponentEntry | undefined {
  return workbenchComponents.find((c) => c.id === id);
}

export function getComponentIds(): string[] {
  return workbenchComponents.map((c) => c.id);
}
