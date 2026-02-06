"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
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

export function POIMapDemo() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("inline");
  const previousDisplayModeRef = useRef<DisplayMode | null>(null);
  const lastDisplayModeRef = useRef<DisplayMode>("inline");

  useEffect(() => {
    if (lastDisplayModeRef.current === displayMode) return;
    previousDisplayModeRef.current = lastDisplayModeRef.current;
    lastDisplayModeRef.current = displayMode;
  }, [displayMode]);

  const [widgetState, setWidgetState] = useState<POIMapViewState>({
    ...DEFAULT_WIDGET_STATE,
    mapCenter: POI_MAP_DEMO_INPUT.initialCenter ?? DEFAULT_CENTER,
    mapZoom: POI_MAP_DEMO_INPUT.initialZoom ?? DEFAULT_ZOOM,
  });

  const [view, setView] = useState<View | null>(null);

  const handleWidgetStateChange = useCallback(
    (partialState: Partial<POIMapViewState>) => {
      setWidgetState((prev) => ({ ...prev, ...partialState }));
    },
    [],
  );

  const handleRequestDisplayMode = useCallback((mode: DisplayMode) => {
    setDisplayMode(mode);
  }, []);

  const handleViewDetails = useCallback((poiId: string) => {
    setView({ mode: "modal", params: { poiId } });
  }, []);

  const handleDismissModal = useCallback(() => {
    setView(null);
  }, []);

  const handleOpenExternal = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <POIMap
      id={POI_MAP_DEMO_INPUT.id}
      pois={POI_MAP_DEMO_INPUT.pois}
      initialCenter={POI_MAP_DEMO_INPUT.initialCenter}
      initialZoom={POI_MAP_DEMO_INPUT.initialZoom}
      title={POI_MAP_DEMO_INPUT.title}
      displayMode={displayMode}
      previousDisplayMode={previousDisplayModeRef.current ?? undefined}
      widgetState={widgetState}
      theme="dark"
      view={view}
      onWidgetStateChange={handleWidgetStateChange}
      onRequestDisplayMode={handleRequestDisplayMode}
      onViewDetails={handleViewDetails}
      onDismissModal={handleDismissModal}
      onOpenExternal={handleOpenExternal}
    />
  );
}
