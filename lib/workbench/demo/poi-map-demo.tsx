"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type POICategory,
  POIMap,
  type POIMapViewState,
} from "@/components/examples/poi-map";
import { POI_MAP_DEMO_INPUT } from "./default-props";
import { resolveDemoWidgetState } from "./poi-map-demo-state";

type DisplayMode = "inline" | "pip" | "fullscreen";
type DemoTheme = "light" | "dark";

type View = {
  mode: "modal" | "inline";
  params: Record<string, unknown> | null;
};

type DemoOpenAI = {
  theme?: DemoTheme;
  previewTheme?: DemoTheme;
  displayMode?: DisplayMode;
  widgetState?: unknown;
  requestDisplayMode?: (args: {
    mode: DisplayMode;
  }) => Promise<{ mode: DisplayMode }>;
  setWidgetState?: (state: POIMapViewState) => void;
  callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  openExternal?: (payload: { href: string }) => void;
  sendFollowUpMessage?: (args: { prompt: string }) => Promise<unknown>;
};

function getDemoOpenAI(): DemoOpenAI | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { openai?: DemoOpenAI }).openai;
}

function normalizeDisplayMode(value: unknown): DisplayMode | null {
  if (value === "inline" || value === "pip" || value === "fullscreen") {
    return value;
  }
  return null;
}

function normalizeTheme(value: unknown): DemoTheme | null {
  if (value === "light" || value === "dark") {
    return value;
  }
  return null;
}

export function POIMapDemo() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    () => normalizeDisplayMode(getDemoOpenAI()?.displayMode) ?? "inline",
  );
  const [theme, setTheme] = useState<DemoTheme>(
    () =>
      normalizeTheme(getDemoOpenAI()?.previewTheme || getDemoOpenAI()?.theme) ??
      "light",
  );

  const [widgetState, setWidgetState] = useState<POIMapViewState>(() =>
    resolveDemoWidgetState(getDemoOpenAI()?.widgetState),
  );

  const [view, setView] = useState<View | null>(null);

  useEffect(() => {
    function syncFromHost(globals?: {
      displayMode?: unknown;
      theme?: unknown;
      previewTheme?: unknown;
      widgetState?: unknown;
    }) {
      const nextDisplayMode = normalizeDisplayMode(globals?.displayMode);
      if (nextDisplayMode) {
        setDisplayMode(nextDisplayMode);
      }

      const nextTheme = normalizeTheme(globals?.previewTheme || globals?.theme);
      if (nextTheme) {
        setTheme(nextTheme);
      }

      if (globals && "widgetState" in globals) {
        setWidgetState(resolveDemoWidgetState(globals.widgetState));
      }
    }

    syncFromHost(getDemoOpenAI());

    function handleSetGlobals(event: Event) {
      const detail = (
        event as CustomEvent<{
          globals?: {
            displayMode?: unknown;
            theme?: unknown;
            previewTheme?: unknown;
            widgetState?: unknown;
          };
        }>
      ).detail;
      syncFromHost(detail?.globals);
    }

    window.addEventListener("openai:set_globals", handleSetGlobals);

    // Also listen for theme changes from the iframe shim
    function handleThemeChange() {
      const currentTheme =
        getDemoOpenAI()?.previewTheme || getDemoOpenAI()?.theme;
      if (currentTheme) {
        setTheme(currentTheme);
      }
    }
    window.addEventListener("themechange", handleThemeChange);

    return () => {
      window.removeEventListener("openai:set_globals", handleSetGlobals);
      window.removeEventListener("themechange", handleThemeChange);
    };
  }, []);

  const handleWidgetStateChange = useCallback(
    (partialState: Partial<POIMapViewState>) => {
      setWidgetState((prev) => {
        const nextState = { ...prev, ...partialState };
        getDemoOpenAI()?.setWidgetState?.(nextState);
        return nextState;
      });
    },
    [],
  );

  const handleRequestDisplayMode = useCallback((mode: DisplayMode) => {
    const openai = getDemoOpenAI();
    if (!openai?.requestDisplayMode) {
      setDisplayMode(mode);
      return;
    }

    void openai
      .requestDisplayMode({ mode })
      .then((result) => {
        setDisplayMode(result?.mode ?? mode);
      })
      .catch(() => {
        setDisplayMode(mode);
      });
  }, []);

  const handleViewDetails = useCallback((poiId: string) => {
    setView({ mode: "modal", params: { poiId } });
  }, []);

  const handleDismissModal = useCallback(() => {
    setView(null);
  }, []);

  const handleOpenExternal = useCallback((url: string) => {
    const openai = getDemoOpenAI();
    if (openai?.openExternal) {
      openai.openExternal({ href: url });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handleRefresh = useCallback(() => {
    void getDemoOpenAI()?.callTool?.("refresh_pois", {
      center: widgetState.mapCenter,
      zoom: widgetState.mapZoom,
    });
  }, [widgetState.mapCenter, widgetState.mapZoom]);

  const handleToggleFavorite = useCallback(
    (poiId: string, isFavorite: boolean) => {
      void getDemoOpenAI()?.callTool?.("toggle_favorite", {
        poi_id: poiId,
        is_favorite: isFavorite,
      });
    },
    [],
  );

  const handleFilterCategory = useCallback((category: POICategory | null) => {
    void getDemoOpenAI()?.callTool?.("filter_pois", { category });
  }, []);

  const handleSendFollowUpMessage = useCallback((prompt: string) => {
    void getDemoOpenAI()?.sendFollowUpMessage?.({ prompt });
  }, []);

  return (
    <POIMap
      id={POI_MAP_DEMO_INPUT.id}
      pois={POI_MAP_DEMO_INPUT.pois}
      initialCenter={POI_MAP_DEMO_INPUT.initialCenter}
      initialZoom={POI_MAP_DEMO_INPUT.initialZoom}
      title={POI_MAP_DEMO_INPUT.title}
      displayMode={displayMode}
      previousDisplayMode="inline"
      widgetState={widgetState}
      theme={theme}
      view={view}
      onWidgetStateChange={handleWidgetStateChange}
      onRequestDisplayMode={handleRequestDisplayMode}
      onRefresh={handleRefresh}
      onToggleFavorite={handleToggleFavorite}
      onFilterCategory={handleFilterCategory}
      onViewDetails={handleViewDetails}
      onDismissModal={handleDismissModal}
      onOpenExternal={handleOpenExternal}
      onSendFollowUpMessage={handleSendFollowUpMessage}
    />
  );
}
