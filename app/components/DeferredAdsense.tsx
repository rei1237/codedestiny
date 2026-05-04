"use client";

import { useEffect } from "react";

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9863227498729828";

function injectAdsenseOnce() {
  if (typeof document === "undefined") return;
  if (document.querySelector('script[data-cd-adsense="1"]')) return;

  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = ADSENSE_SRC;
  script.setAttribute("data-cd-adsense", "1");
  document.head.appendChild(script);
}

export default function DeferredAdsense() {
  useEffect(() => {
    let loaded = false;

    const load = () => {
      if (loaded) return;
      loaded = true;
      injectAdsenseOnce();
      window.removeEventListener("pointerdown", load, true);
      window.removeEventListener("touchstart", load, true);
      window.removeEventListener("keydown", load, true);
      window.removeEventListener("scroll", load, true);
    };

    const idleLoad =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(() => load(), { timeout: 5000 })
        : (window as any).setTimeout(() => load(), 4500);

    window.addEventListener("pointerdown", load, true);
    window.addEventListener("touchstart", load, true);
    window.addEventListener("keydown", load, true);
    window.addEventListener("scroll", load, true);

    return () => {
      if (typeof idleLoad === "number") {
        window.clearTimeout(idleLoad);
      } else if ("cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleLoad);
      }
      window.removeEventListener("pointerdown", load, true);
      window.removeEventListener("touchstart", load, true);
      window.removeEventListener("keydown", load, true);
      window.removeEventListener("scroll", load, true);
    };
  }, []);

  return null;
}
