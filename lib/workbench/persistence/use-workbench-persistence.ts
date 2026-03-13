"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { getComponent } from "../component-registry";
import { useWorkbenchStore } from "../store";
import {
  readLocalStorageMockConfig,
  readLocalStoragePreferences,
  readSessionStorageConsole,
  writeLocalStorageMockConfig,
  writeLocalStoragePreferences,
  writeSessionStorageConsole,
} from "./storage";
import type { UrlState } from "./types";
import { buildUrlParams, parseUrlParams } from "./url";

export function useWorkbenchPersistence() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInitialized = useRef(false);
  const isUpdatingFromUrl = useRef(false);
  const isDemoMode = useDemoMode();
  const [isReady, setIsReady] = useState(false);

  const store = useWorkbenchStore();

  useLayoutEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const prefs = readLocalStoragePreferences();
    if (prefs.maxHeight !== undefined) store.setMaxHeight(prefs.maxHeight);
    if (prefs.safeAreaInsets) store.setSafeAreaInsets(prefs.safeAreaInsets);
    if (prefs.locale) store.setLocale(prefs.locale);
    if (prefs.previewTheme) store.setPreviewTheme(prefs.previewTheme);
    if (prefs.isLeftPanelOpen !== undefined)
      store.setLeftPanelOpen(prefs.isLeftPanelOpen);
    if (!isDemoMode && prefs.isRightPanelOpen !== undefined)
      store.setRightPanelOpen(prefs.isRightPanelOpen);

    const consoleLogs = readSessionStorageConsole();
    if (consoleLogs.length > 0) {
      store.restoreConsoleLogs(consoleLogs);
    }

    const mockConfig = readLocalStorageMockConfig();
    if (mockConfig) {
      store.setMockConfig(mockConfig);
    }

    isUpdatingFromUrl.current = true;
    const urlState = parseUrlParams(searchParams);
    const initialComponentId = urlState.component ?? store.selectedComponent;
    if (urlState.component) store.setSelectedComponent(initialComponentId);
    if (urlState.mode) store.setDisplayMode(urlState.mode);
    if (urlState.device) store.setDeviceType(urlState.device);
    // URL theme is for shell/theme chrome only; previewTheme remains independent.
    if (urlState.theme) store.setTheme(urlState.theme);
    isUpdatingFromUrl.current = false;

    // Initialize toolInput with component's defaultProps if empty
    const currentToolInput = useWorkbenchStore.getState().toolInput;
    if (Object.keys(currentToolInput).length === 0) {
      const component = getComponent(initialComponentId);
      if (component?.defaultProps) {
        store.setToolInput(component.defaultProps);
      }
    }

    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isInitialized.current || isUpdatingFromUrl.current) return;

    const currentUrlState: UrlState = {
      mode: store.displayMode,
      device: store.deviceType,
      theme: store.theme,
      component: store.selectedComponent,
    };

    const currentSearch = searchParams.toString();
    const newParams = new URLSearchParams(currentSearch);
    const persistedParams = buildUrlParams(currentUrlState);
    for (const [key, value] of persistedParams.entries()) {
      newParams.set(key, value);
    }
    const newSearch = newParams.toString();

    if (currentSearch !== newSearch) {
      router.replace(`?${newSearch}`, { scroll: false });
    }
  }, [
    store.displayMode,
    store.deviceType,
    store.theme,
    store.selectedComponent,
    router,
    searchParams,
  ]);

  useEffect(() => {
    if (!isInitialized.current) return;

    const timer = setTimeout(() => {
      writeLocalStoragePreferences({
        maxHeight: store.maxHeight,
        safeAreaInsets: store.safeAreaInsets,
        locale: store.locale,
        previewTheme: store.previewTheme,
        collapsedSections: store.collapsedSections,
        isLeftPanelOpen: store.isLeftPanelOpen,
        isRightPanelOpen: store.isRightPanelOpen,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [
    store.maxHeight,
    store.safeAreaInsets,
    store.locale,
    store.previewTheme,
    store.collapsedSections,
    store.isLeftPanelOpen,
    store.isRightPanelOpen,
  ]);

  useEffect(() => {
    if (!isInitialized.current) return;
    const timer = setTimeout(() => {
      writeSessionStorageConsole(store.consoleLogs);
    }, 500);
    return () => clearTimeout(timer);
  }, [store.consoleLogs]);

  useEffect(() => {
    if (!isInitialized.current) return;
    const timer = setTimeout(() => {
      writeLocalStorageMockConfig(store.mockConfig);
    }, 500);
    return () => clearTimeout(timer);
  }, [store.mockConfig]);

  return isReady;
}
