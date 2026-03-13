import type { POIMapViewState } from "@/components/examples/poi-map";
import { resolveSerializablePOIMapInput } from "./wrappers/poi-map-input";
import { mergePOIMapWidgetState } from "./wrappers/poi-map-widget-state";

function resolvePoiMapInitialWidgetState(
  toolInput: Record<string, unknown>,
): POIMapViewState {
  const parsed = resolveSerializablePOIMapInput(toolInput, undefined);

  return mergePOIMapWidgetState(
    {
      selectedPoiId: null,
      favoriteIds: [],
      mapCenter: parsed.initialCenter,
      mapZoom: parsed.initialZoom,
      categoryFilter: null,
    },
    null,
  );
}

export function resolveInitialWidgetState(
  componentId: string,
  toolInput: Record<string, unknown>,
): Record<string, unknown> {
  switch (componentId) {
    case "poi-map":
      return resolvePoiMapInitialWidgetState(toolInput);
    default:
      return {};
  }
}

export function resolveVisibleWidgetState(
  componentId: string,
  toolInput: Record<string, unknown>,
  widgetState: Record<string, unknown> | null,
): Record<string, unknown> {
  const initialWidgetState = resolveInitialWidgetState(componentId, toolInput);

  switch (componentId) {
    case "poi-map":
      return mergePOIMapWidgetState(
        initialWidgetState as POIMapViewState,
        widgetState as Partial<POIMapViewState> | null,
      );
    default:
      return widgetState ?? initialWidgetState;
  }
}

export function resolveResetWidgetState(
  _componentId: string,
  _toolInput: Record<string, unknown>,
): Record<string, unknown> | null {
  // Reset should clear persisted widget state so visible defaults stay derived
  // from the latest App Props rather than freezing a snapshot.
  return null;
}
