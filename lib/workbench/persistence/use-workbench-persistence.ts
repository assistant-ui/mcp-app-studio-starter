"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
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

  const store = useWorkbenchStore();

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const prefs = readLocalStoragePreferences();
    if (prefs.maxHeight !== undefined) store.setMaxHeight(prefs.maxHeight);
    if (prefs.safeAreaInsets) store.setSafeAreaInsets(prefs.safeAreaInsets);
    if (prefs.locale) store.setLocale(prefs.locale);
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
    if (urlState.mode) store.setDisplayMode(urlState.mode);
    if (urlState.device) store.setDeviceType(urlState.device);
    if (urlState.theme) store.setTheme(urlState.theme);
    isUpdatingFromUrl.current = false;

    // Initialize toolInput with component's defaultProps if empty
    const currentToolInput = store.toolInput;
    if (Object.keys(currentToolInput).length === 0) {
      const component = getComponent(store.selectedComponent);
      if (component?.defaultProps) {
        store.setToolInput(component.defaultProps);
      }
    }
  }, []);

  useEffect(() => {
    if (!isInitialized.current || isUpdatingFromUrl.current) return;

    const currentUrlState: UrlState = {
      mode: store.displayMode,
      device: store.deviceType,
      theme: store.theme,
    };

    const newParams = buildUrlParams(currentUrlState);
    const currentSearch = searchParams.toString();
    const newSearch = newParams.toString();

    if (currentSearch !== newSearch) {
      router.replace(`?${newSearch}`, { scroll: false });
    }
  }, [store.displayMode, store.deviceType, store.theme, router, searchParams]);

  useEffect(() => {
    if (!isInitialized.current) return;

    writeLocalStoragePreferences({
      maxHeight: store.maxHeight,
      safeAreaInsets: store.safeAreaInsets,
      locale: store.locale,
      collapsedSections: store.collapsedSections,
      isLeftPanelOpen: store.isLeftPanelOpen,
      isRightPanelOpen: store.isRightPanelOpen,
    });
  }, [
    store.maxHeight,
    store.safeAreaInsets,
    store.locale,
    store.collapsedSections,
    store.isLeftPanelOpen,
    store.isRightPanelOpen,
  ]);

  useEffect(() => {
    if (!isInitialized.current) return;
    writeSessionStorageConsole(store.consoleLogs);
  }, [store.consoleLogs]);

  useEffect(() => {
    if (!isInitialized.current) return;
    writeLocalStorageMockConfig(store.mockConfig);
  }, [store.mockConfig]);
}
