"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SpritePlaybackGateOptions = {
  enabled?: boolean;
  rootMargin?: string;
  mobileQuery?: string;
  pauseWhenOffscreen?: boolean;
};

export function useSpritePlaybackGate<TElement extends HTMLElement = HTMLElement>({
  enabled = true,
  rootMargin = "160px",
  mobileQuery = "(max-width: 768px)",
  pauseWhenOffscreen = true,
}: SpritePlaybackGateOptions = {}) {
  const ref = useRef<TElement | null>(null);
  const [isInView, setIsInView] = useState(!pauseWhenOffscreen);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const updateVisibility = () => setIsPageVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const viewportQuery = window.matchMedia(mobileQuery);
    const update = () => {
      setPrefersReducedMotion(motionQuery.matches);
      setIsMobile(viewportQuery.matches);
    };
    update();
    motionQuery.addEventListener("change", update);
    viewportQuery.addEventListener("change", update);
    return () => {
      motionQuery.removeEventListener("change", update);
      viewportQuery.removeEventListener("change", update);
    };
  }, [mobileQuery]);

  useEffect(() => {
    if (!enabled || !pauseWhenOffscreen) {
      setIsInView(Boolean(enabled));
      return;
    }
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(Boolean(entry?.isIntersecting)),
      { rootMargin, threshold: 0.01 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, pauseWhenOffscreen, rootMargin]);

  const canLoad = enabled && isInView;
  const canAnimate = canLoad && isPageVisible && !prefersReducedMotion;

  return useMemo(
    () => ({
      ref,
      isInView,
      isPageVisible,
      prefersReducedMotion,
      isMobile,
      canLoad,
      canAnimate,
    }),
    [canAnimate, canLoad, isInView, isMobile, isPageVisible, prefersReducedMotion],
  );
}

export function useLazySpriteSource(src: string, enabled: boolean) {
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "failed">("idle");

  useEffect(() => {
    if (!src || !enabled) {
      setStatus("idle");
      return;
    }
    let cancelled = false;
    const image = new Image();
    setStatus("loading");
    image.decoding = "async";
    image.onload = () => {
      if (!cancelled) setStatus("loaded");
    };
    image.onerror = () => {
      if (!cancelled) setStatus("failed");
    };
    image.src = src;
    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [enabled, src]);

  return {
    status,
    isLoaded: status === "loaded",
    isFailed: status === "failed",
    resolvedSrc: status === "loaded" ? src : "",
  };
}
