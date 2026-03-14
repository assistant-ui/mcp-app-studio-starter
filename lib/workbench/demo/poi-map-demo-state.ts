import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  type POIMapViewState,
} from "@/components/examples/poi-map";
import { mergePOIMapWidgetState } from "../wrappers/poi-map-widget-state";
import { POI_MAP_DEMO_INPUT } from "./default-props";

function isWidgetStateShape(value: unknown): value is Partial<POIMapViewState> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getDefaultDemoWidgetState(): POIMapViewState {
  return {
    selectedPoiId: null,
    favoriteIds: [],
    mapCenter: POI_MAP_DEMO_INPUT.initialCenter ?? DEFAULT_CENTER,
    mapZoom: POI_MAP_DEMO_INPUT.initialZoom ?? DEFAULT_ZOOM,
    categoryFilter: null,
  };
}

export function resolveDemoWidgetState(widgetState: unknown): POIMapViewState {
  return mergePOIMapWidgetState(
    getDefaultDemoWidgetState(),
    isWidgetStateShape(widgetState) ? widgetState : null,
  );
}
