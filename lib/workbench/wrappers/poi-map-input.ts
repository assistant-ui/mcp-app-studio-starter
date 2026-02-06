import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  parseSerializablePOIMap,
} from "@/components/examples/poi-map";

type SerializablePOIMap = ReturnType<typeof parseSerializablePOIMap>;

const FALLBACK_POI_MAP_INPUT: SerializablePOIMap = {
  id: "demo-poi-map",
  pois: [],
  initialCenter: DEFAULT_CENTER,
  initialZoom: DEFAULT_ZOOM,
  title: "Places",
};

export function readOpenAIToolInputForPOIMap() {
  if (typeof window === "undefined") return undefined;
  const openai = (
    window as Window & {
      openai?: { toolInput?: unknown };
    }
  ).openai;
  return openai?.toolInput;
}

export function resolveSerializablePOIMapInput(
  primaryInput: unknown,
  fallbackInput?: unknown,
): SerializablePOIMap {
  const candidates: unknown[] = [
    primaryInput,
    fallbackInput,
    FALLBACK_POI_MAP_INPUT,
  ];

  for (const candidate of candidates) {
    try {
      return parseSerializablePOIMap(candidate);
    } catch {
      // try next candidate
    }
  }

  return FALLBACK_POI_MAP_INPUT;
}
