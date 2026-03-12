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
