import { componentConfigs } from "../component-configs";
import type { DeviceType, DisplayMode, Theme } from "../types";
import { URL_PARAMS } from "./constants";
import type { UrlState } from "./types";

const VALID_MODES: DisplayMode[] = ["inline", "pip", "fullscreen"];
const VALID_THEMES: Theme[] = ["light", "dark"];
const VALID_DEVICES: DeviceType[] = [
  "mobile",
  "tablet",
  "desktop",
  "resizable",
];
const VALID_COMPONENT_IDS = new Set(
  componentConfigs.map((config) => config.id),
);
const DEFAULT_COMPONENT = componentConfigs[0]?.id ?? "welcome";

function normalizeComponentId(componentId: string): string {
  return VALID_COMPONENT_IDS.has(componentId) ? componentId : DEFAULT_COMPONENT;
}

export function parseUrlParams(
  searchParams: URLSearchParams,
): Partial<UrlState> {
  const result: Partial<UrlState> = {};

  const modeParam = searchParams.get(URL_PARAMS.MODE) as DisplayMode | null;
  if (modeParam && VALID_MODES.includes(modeParam)) {
    result.mode = modeParam;
  }

  const deviceParam = searchParams.get(URL_PARAMS.DEVICE) as DeviceType | null;
  if (deviceParam && VALID_DEVICES.includes(deviceParam)) {
    result.device = deviceParam;
  }

  const themeParam = searchParams.get(URL_PARAMS.THEME) as Theme | null;
  if (themeParam && VALID_THEMES.includes(themeParam)) {
    result.theme = themeParam;
  }

  const componentParam = searchParams.get(URL_PARAMS.COMPONENT);
  if (componentParam !== null) {
    result.component = normalizeComponentId(componentParam);
  }

  return result;
}

export function buildUrlParams(state: UrlState): URLSearchParams {
  const params = new URLSearchParams();
  params.set(URL_PARAMS.MODE, state.mode);
  params.set(URL_PARAMS.DEVICE, state.device);
  params.set(URL_PARAMS.THEME, state.theme);
  params.set(URL_PARAMS.COMPONENT, normalizeComponentId(state.component));
  return params;
}

export function buildPersistedWorkbenchUrl({
  currentSearch,
  currentHash,
  state,
}: {
  currentSearch: string;
  currentHash: string;
  state: UrlState;
}): string {
  const normalizedSearch = currentSearch.startsWith("?")
    ? currentSearch.slice(1)
    : currentSearch;
  const params = new URLSearchParams(normalizedSearch);

  for (const [key, value] of buildUrlParams(state).entries()) {
    params.set(key, value);
  }

  const nextSearch = params.toString();
  const nextHash =
    currentHash.length === 0 || currentHash.startsWith("#")
      ? currentHash
      : `#${currentHash}`;

  return `${nextSearch.length > 0 ? `?${nextSearch}` : ""}${nextHash}`;
}
