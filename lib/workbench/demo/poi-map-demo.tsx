"use client";

import { useCallback, useState } from "react";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  type POICategory,
  POIMap,
  type POIMapViewState,
} from "@/components/examples/poi-map";
import { POI_MAP_DEMO_INPUT } from "./default-props";

type DisplayMode = "inline" | "pip" | "fullscreen";

type View = {
  mode: "modal" | "inline";
  params: Record<string, unknown> | null;
};

const DEFAULT_WIDGET_STATE: POIMapViewState = {
  selectedPoiId: null,
  favoriteIds: [],
  mapCenter: DEFAULT_CENTER,
  mapZoom: DEFAULT_ZOOM,
  categoryFilter: null,
};

type DemoOpenAI = {
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

export function POIMapDemo() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("inline");

  const [widgetState, setWidgetState] = useState<POIMapViewState>({
    ...DEFAULT_WIDGET_STATE,
    mapCenter: POI_MAP_DEMO_INPUT.initialCenter ?? DEFAULT_CENTER,
    mapZoom: POI_MAP_DEMO_INPUT.initialZoom ?? DEFAULT_ZOOM,
  });

  const [view, setView] = useState<View | null>(null);

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
      theme="dark"
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
