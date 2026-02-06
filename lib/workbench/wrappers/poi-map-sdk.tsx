"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  type POICategory,
  POIMap,
  type POIMapViewState,
} from "@/components/examples/poi-map";
import {
  type DisplayMode,
  useCallTool,
  useDisplayMode,
  useFeature,
  useOpenLink,
  useSendMessage,
  useTheme,
  useToolInput,
  useWidgetState,
} from "@/lib/sdk";
import {
  readOpenAIToolInputForPOIMap,
  resolveSerializablePOIMapInput,
} from "./poi-map-input";

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

/**
 * Workbench + export wrapper for the POI map widget.
 *
 * Notes on ChatGPT-specific behavior:
 * - ChatGPT may provide additional APIs via `window.openai` (widgetState, files, etc).
 * - The universal SDK treats those as optional extensions; this widget checks
 *   `useFeature('widgetState')` and falls back to local state when unavailable.
 */
export function POIMapSDK() {
  const toolInput = useToolInput<Record<string, unknown>>();
  const parsed = useMemo(
    () =>
      resolveSerializablePOIMapInput(
        toolInput ?? {},
        readOpenAIToolInputForPOIMap(),
      ),
    [toolInput],
  );

  const [mode, requestDisplayMode] = useDisplayMode();
  const previousDisplayModeRef = useRef<DisplayMode | null>(null);
  const lastModeRef = useRef(mode);

  useEffect(() => {
    if (lastModeRef.current !== mode) {
      previousDisplayModeRef.current = lastModeRef.current as DisplayMode;
      lastModeRef.current = mode;
    }
  }, [mode]);

  const theme = useTheme();
  const openLink = useOpenLink();
  const sendMessage = useSendMessage();
  const callTool = useCallTool();

  const hasWidgetState = useFeature("widgetState");
  const [persistedState, setPersistedState] = useWidgetState<POIMapViewState>();
  const [localState, setLocalState] =
    useState<POIMapViewState>(DEFAULT_WIDGET_STATE);

  const baseState = hasWidgetState
    ? (persistedState ?? DEFAULT_WIDGET_STATE)
    : localState;

  const derivedDefaults = useMemo(
    () => ({
      ...DEFAULT_WIDGET_STATE,
      mapCenter: parsed.initialCenter ?? DEFAULT_CENTER,
      mapZoom: parsed.initialZoom ?? DEFAULT_ZOOM,
    }),
    [parsed.initialCenter, parsed.initialZoom],
  );

  const currentWidgetState = useMemo<POIMapViewState>(
    () => ({
      ...derivedDefaults,
      ...baseState,
    }),
    [baseState, derivedDefaults],
  );

  const handleWidgetStateChange = useCallback(
    (partialState: Partial<POIMapViewState>) => {
      const next = { ...currentWidgetState, ...partialState };
      if (hasWidgetState) {
        setPersistedState(next);
      } else {
        setLocalState(next);
      }
    },
    [currentWidgetState, hasWidgetState, setPersistedState],
  );

  const handleRequestDisplayMode = useCallback(
    async (nextMode: DisplayMode) => {
      await requestDisplayMode(nextMode);
    },
    [requestDisplayMode],
  );

  const handleRefresh = useCallback(async () => {
    await callTool("refresh_pois", {
      center: currentWidgetState.mapCenter,
      zoom: currentWidgetState.mapZoom,
    });
  }, [callTool, currentWidgetState.mapCenter, currentWidgetState.mapZoom]);

  const handleToggleFavorite = useCallback(
    async (poiId: string, isFavorite: boolean) => {
      await callTool("toggle_favorite", {
        poi_id: poiId,
        is_favorite: isFavorite,
      });
    },
    [callTool],
  );

  const handleFilterCategory = useCallback(
    async (category: POICategory | null) => {
      await callTool("filter_pois", {
        category,
      });
    },
    [callTool],
  );

  const [localView, setLocalView] = useState<View | null>(null);
  const handleViewDetails = useCallback((poiId: string) => {
    setLocalView({
      mode: "modal",
      params: { poiId },
    });
  }, []);

  const handleDismissModal = useCallback(() => {
    setLocalView(null);
  }, []);

  const handleOpenExternal = useCallback(
    (url: string) => {
      void openLink(url);
    },
    [openLink],
  );

  const handleSendFollowUpMessage = useCallback(
    async (prompt: string) => {
      await sendMessage(prompt);
    },
    [sendMessage],
  );

  return (
    <POIMap
      id={parsed.id}
      pois={parsed.pois}
      initialCenter={parsed.initialCenter}
      initialZoom={parsed.initialZoom}
      title={parsed.title}
      displayMode={mode as unknown as DisplayMode}
      previousDisplayMode={previousDisplayModeRef.current ?? undefined}
      widgetState={currentWidgetState}
      theme={theme}
      view={localView}
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
