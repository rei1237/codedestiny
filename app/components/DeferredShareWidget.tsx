"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

type ShareWidgetProps = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  contentType?: "website" | "article" | "collection" | "software" | "result";
  contentId?: string;
};

const ShareWidget = dynamic(() => import("./ShareWidget"), {
  ssr: false,
  loading: () => null,
});

export default function DeferredShareWidget(props: ShareWidgetProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    const target = mountRef.current;
    if (!target) return;

    if (!("IntersectionObserver" in window)) {
      const id = globalThis.setTimeout(() => setReady(true), 3000);
      return () => globalThis.clearTimeout(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setReady(true);
        observer.disconnect();
      },
      { rootMargin: "480px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [ready]);

  return <div ref={mountRef}>{ready ? <ShareWidget {...props} /> : null}</div>;
}
