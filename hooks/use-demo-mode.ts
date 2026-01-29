"use client";

import { useEffect, useState } from "react";

/**
 * Hook to determine if the app is running in demo mode.
 * Demo mode is enabled via the `demo=true` query parameter.
 * When in demo mode, certain features like export are disabled
 * and show helpful messages directing users to install locally.
 */
export function useDemoMode(): boolean {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsDemoMode(params.get("demo") === "true");
  }, []);

  return isDemoMode;
}
