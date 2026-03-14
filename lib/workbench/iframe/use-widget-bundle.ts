"use client";

import { useEffect, useRef, useState } from "react";

interface BundleState {
  loading: boolean;
  error: string | null;
  bundle: string | null;
}

const bundleCache = new Map<string, string>();

function isDemoBundleRequest(currentLocationSearch: string): boolean {
  const currentParams = new URLSearchParams(
    currentLocationSearch.startsWith("?")
      ? currentLocationSearch.slice(1)
      : currentLocationSearch,
  );

  return currentParams.get("demo") === "true";
}

type BundleBuildMode = "demo" | "runtime" | "static";

function resolveBundleBuildMode(
  currentLocationSearch: string,
  nodeEnv: string = process.env.NODE_ENV ?? "development",
): BundleBuildMode {
  if (isDemoBundleRequest(currentLocationSearch)) {
    return "demo";
  }

  return nodeEnv === "production" ? "static" : "runtime";
}

export function buildBundleCacheKey(
  componentId: string,
  currentLocationSearch: string,
  nodeEnv: string = process.env.NODE_ENV ?? "development",
): string {
  return `${encodeURIComponent(componentId)}::${resolveBundleBuildMode(
    currentLocationSearch,
    nodeEnv,
  )}`;
}

export function buildBundleRequestPath(
  componentId: string,
  currentLocationSearch: string,
  nodeEnv: string = process.env.NODE_ENV ?? "development",
): string {
  const isProduction = nodeEnv === "production";

  if (isProduction) {
    return `/workbench-bundles/${encodeURIComponent(componentId)}.js`;
  }

  const requestParams = new URLSearchParams({ id: componentId });
  if (isDemoBundleRequest(currentLocationSearch)) {
    requestParams.set("demo", "true");
  }
  return `/api/workbench/bundle?${requestParams.toString()}`;
}

export function buildHmrPreviewPath(
  componentId: string,
  currentLocationSearch: string,
): string {
  const requestParams = new URLSearchParams({ component: componentId });
  requestParams.set("mcp-host", "");
  if (isDemoBundleRequest(currentLocationSearch)) {
    requestParams.set("demo", "true");
  }
  return `/__workbench_hmr/lib/workbench/hmr/preview.html?${requestParams.toString()}`;
}

export function useWidgetBundle(
  componentId: string,
  options?: { enabled?: boolean },
): BundleState {
  const enabled = options?.enabled ?? true;
  const currentLocationSearch =
    typeof window === "undefined" ? "" : window.location.search;
  const cacheKey = buildBundleCacheKey(componentId, currentLocationSearch);

  const [state, setState] = useState<BundleState>(() => {
    if (!enabled) {
      return { loading: false, error: null, bundle: null };
    }
    const cached = bundleCache.get(cacheKey);
    if (cached) {
      return { loading: false, error: null, bundle: cached };
    }
    return { loading: true, error: null, bundle: null };
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) {
      abortControllerRef.current?.abort();
      setState({ loading: false, error: null, bundle: null });
      return;
    }

    const cached = bundleCache.get(cacheKey);
    if (cached) {
      setState({ loading: false, error: null, bundle: cached });
      return;
    }

    setState({ loading: true, error: null, bundle: null });

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function fetchBundle() {
      try {
        const requestPath = buildBundleRequestPath(
          componentId,
          currentLocationSearch,
        );
        const response = await fetch(requestPath, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const bundle = await response.text();
        bundleCache.set(cacheKey, bundle);
        setState({ loading: false, error: null, bundle });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        setState({ loading: false, error: message, bundle: null });
      }
    }

    fetchBundle();

    return () => {
      controller.abort();
    };
  }, [cacheKey, componentId, currentLocationSearch, enabled]);

  return state;
}

export function invalidateBundleCache(componentId?: string) {
  if (componentId) {
    const encodedPrefix = `${encodeURIComponent(componentId)}::`;
    for (const key of bundleCache.keys()) {
      if (key.startsWith(encodedPrefix)) {
        bundleCache.delete(key);
      }
    }
  } else {
    bundleCache.clear();
  }
}
