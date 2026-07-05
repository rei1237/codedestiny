"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect if viewport is mobile (≤980px).
 * Mirrors the existing lyrics-panel viewport detection pattern.
 */
export function useIsMobileViewport(breakpointPx: number = 980): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const handleChange = () => setIsMobile(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [breakpointPx]);

  return isMobile;
}
